"""DRF ViewSet for listing and executing workflow transitions."""

__all__ = ("WorkflowViewSet",)

from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.http import Http404
from rest_framework import mixins
from rest_framework import serializers
from rest_framework import status as drf_status
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from vueda.core.decorators import action
from vueda.core.exceptions import VuedaValidationError
from vueda.core.exceptions import gate_warnings
from vueda.core.installed_apps import workflow_enabled
from vueda.core.open_api import conditional_extend_schema_decorator
from vueda.core.open_api import conditional_inline_serializer
from vueda.core.open_api import conditional_open_api_types
from vueda.history.revision import object_revision
from vueda.workflow.exceptions import InvalidTransitionError
from vueda.workflow.filtersets import WorkflowFilterSet
from vueda.workflow.models import Workflow
from vueda.workflow.models import get_workflow_for_model
from vueda.workflow.permissions import WorkflowObjectPermissions
from vueda.workflow.serializers import WorkflowSerializer


class WorkflowViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = WorkflowSerializer
    filterset_class = WorkflowFilterSet
    permit_list_expands = ["states", "transitions"]
    permission_classes = [WorkflowObjectPermissions]

    # Actions that address a target model's data, and so carry that model's own permission gate.
    # The remaining actions describe workflow definitions and carry only the read_workflow gate.
    target_model_permission_actions = frozenset(
        ("execute_transition", "object_state", "object_transitions", "permitted_transitions")
    )
    # Actions that reach a per-object decision, which is what lets a matching state grant settle a
    # model-level denial. permitted_transitions is absent because model-scope discovery has no
    # object whose state could be read.
    object_permission_actions = frozenset(("execute_transition", "object_state", "object_transitions"))
    # Actions that do not require vueda_workflow.read_workflow.
    workflow_gate_exempt_actions = frozenset(("object_state", "permitted_transitions"))

    # Moved 'Workflow.objects.all()' to the function, so we can specify a model for workflow actions during open api docs generation.
    def get_queryset(self):
        if hasattr(self, "queryset_model"):
            return self.queryset_model.objects.all()

        return Workflow.objects.all()

    def get_workflow(self):
        """Return the workflow of the model the request names.

        A model that does not enable ``class Vueda.Workflow`` has no workflow here, whatever rows
        exist, and raises ``Http404``. An enabled model without a definition raises
        ``WorkflowNotConfiguredError``.
        """
        content_type = get_object_or_404(
            ContentType,
            app_label=self.kwargs["app_label"],
            model=self.kwargs["model"].replace("_", ""),
        )
        model = content_type.model_class()
        if model is None or not workflow_enabled(model):
            raise Http404("No workflow matches the given query.")
        return get_workflow_for_model(model)

    def get_object(self):
        """Return the target object, checking its permissions, or the workflow the request names."""
        if "object_id" in self.request_kwargs:
            instance = get_object_or_404(self.get_workflow().content_type.model_class(), pk=self.kwargs["object_id"])
            self.check_object_permissions(self.request, instance)
            return instance
        elif "app_label" in self.request_kwargs:
            return self.get_workflow()

    def resolves_object(self) -> bool:
        """Whether this action decides authorization against each concrete object it touches."""
        return self.action in self.object_permission_actions

    def check_object_permissions(self, request, obj):
        """Check all object permissions, hiding unreadable objects in bulk transition requests."""
        try:
            super().check_object_permissions(request, obj)
        except (PermissionDenied, Http404):
            if self.action != "execute_transition" or self.kwargs.get("object_id") is not None:
                raise
            # Use the same response as a missing id, including when rechecking under the lock.
            get_object_or_404(obj.__class__.objects.none(), pk=obj.pk)

    def dispatch(self, request, *args, **kwargs):
        self.request_kwargs = kwargs
        return super().dispatch(request, *args, **kwargs)

    def check_permissions(self, request):
        # permitted_transitions decides its own read_workflow requirement, once it has resolved
        # whether a workflow exists for the target model (see permitted_transitions below).
        # object_state reports the target object's own current state, so the target model's read
        # permission is the whole gate. Every other action requires read_workflow before the
        # target model's own permission is checked below.
        if self.action not in self.workflow_gate_exempt_actions and not request.user.has_perm(
            "vueda_workflow.read_workflow"
        ):
            raise PermissionDenied("You do not have permission to perform this action.")
        return super().check_permissions(request)

    @conditional_extend_schema_decorator(
        summary="Get object state",
        responses={
            200: conditional_inline_serializer(
                "ObjectStateResponse",
                fields={
                    "state": conditional_inline_serializer(
                        "ObjectState",
                        fields={
                            "code": serializers.CharField(),
                            "name": serializers.CharField(),
                        },
                    ),
                    "object_state_revision": serializers.CharField(required=False),
                },
            ),
            403: conditional_inline_serializer(
                "WorkflowPermissionError",
                fields={"detail": serializers.CharField()},
            ),
            404: conditional_inline_serializer(
                "WorkflowNotFoundError",
                fields={"detail": serializers.CharField()},
            ),
        },
    )
    @action(detail=True, methods=["get"], url_path=r"object-state/(?P<object_id>[^/.]+)")
    def object_state(self, request, app_label, model, object_id):
        # get_object has already checked this object's read permission, so reaching here means the
        # caller may read the object whose state this reports.
        instance = self.get_object()
        if not workflow_enabled(instance):
            return Response(
                data={"detail": "Object does not have a workflow."},
                exception=Exception("Object does not have a workflow."),
                status=drf_status.HTTP_404_NOT_FOUND,
            )

        state = instance.workflow_state
        response_data = {
            "state": {"code": state.code, "name": state.name},
        }
        revision = object_revision(instance.object_state)
        if revision is not None:
            response_data["object_state_revision"] = revision
        return Response(response_data)

    @conditional_extend_schema_decorator(
        summary="Get permitted transitions",
        responses={
            200: conditional_inline_serializer(
                "TransitionEntry",
                fields={
                    "code": serializers.CharField(),
                    "name": serializers.CharField(),
                },
                many=True,
            ),
            403: conditional_inline_serializer(
                "WorkflowPermissionError",
                fields={"detail": serializers.CharField()},
            ),
        },
    )
    @action(detail=True, methods=["get"])
    def permitted_transitions(self, request, app_label, model):
        try:
            workflow = self.get_workflow()
        except Http404:
            return Response([])

        if not request.user.has_perm("vueda_workflow.read_workflow"):
            raise PermissionDenied("You do not have permission to perform this action.")

        user = request.user
        if user is not None:
            workflow_permissions = [
                ".".join(permission_parts)
                for permission_parts in workflow.workflow_permissions.values_list(
                    "permission__content_type__app_label",
                    "permission__codename",
                )
            ]
            if not workflow_permissions or not user.has_perms(workflow_permissions):
                raise PermissionDenied(
                    f"User {user.get_username()!r} does not have workflow permissions for {workflow.content_type!r}"
                )

        transitions = workflow.transitions.exclude(transition_permissions__isnull=True).select_related("target").all()
        permitted_ids = []
        for transition in transitions:
            perms = [
                ".".join(p)
                for p in transition.transition_permissions.values_list(
                    "permission__content_type__app_label",
                    "permission__codename",
                )
            ]
            if user is None:
                if perms:
                    permitted_ids.append(transition.id)
            elif user.has_perms(perms):
                permitted_ids.append(transition.id)

        result = transitions.filter(pk__in=permitted_ids).order_by("name").values("code", "name")
        return Response(list(result))

    @conditional_extend_schema_decorator(
        summary="Get object transitions",
        responses={
            200: conditional_inline_serializer(
                "TransitionEntry",
                fields={
                    "code": serializers.CharField(),
                    "name": serializers.CharField(),
                },
                many=True,
            ),
        },
    )
    @action(detail=True, methods=["get"], url_path=r"object-transitions/(?P<object_id>[^/.]+)")
    def object_transitions(self, request, app_label, model, object_id):
        # get_object has checked this object's read permission. The workflow's configured
        # permissions are then checked against that object, so a permission backend that scopes a
        # workflow permission to particular objects decides here rather than at model scope.
        instance = self.get_object()
        instance.check_workflow_permission(request.user, obj=instance)
        return Response(list(instance.available_transitions(request.user).order_by("name").values("code", "name")))

    @conditional_extend_schema_decorator(
        responses={
            200: conditional_open_api_types().OBJECT,
            400: conditional_open_api_types().OBJECT,
        },
    )
    @action(detail=True, bulk=True, methods=["patch"], url_path=r"execute-transition(?:/(?P<object_id>[^/.]+))?")
    def execute_transition(self, request, app_label, model, object_id=None):
        transition_code = request.data.get("transition_code")
        if object_id:
            instance = self.get_object()
            transition, resolved_user = self._check_transition_for_instance(instance, transition_code, request)
            gate_warnings(request, instance.get_transition_warnings(transition, resolved_user))
            with transaction.atomic():
                response_data = self._apply_transition_to_instance(instance, transition_code, request)
            return Response(response_data)
        else:
            object_ids = request.data.get("object_ids", [])
            if not isinstance(object_ids, list):
                raise VuedaValidationError({"object_ids": ["Must be a list of primary keys."]})

            model_class = self.get_workflow().content_type.model_class()
            # Key every dict below off the resolved instance's own pk (cast to str), not the raw
            # request value. object_ids is client-supplied JSON, which may mix numeric and string
            # types (or the same ids typed differently across a gate/retry round trip); either of
            # those would corrupt gate_warnings' digest -- mixed key types make
            # json.dumps(sort_keys=True) raise TypeError, and same-value-different-type keys sort
            # differently (numeric vs lexicographic), changing the digest for identical warnings.
            # The resolved pk is authoritative and always the same type, so this is stable regardless
            # of what the request sent.
            id_instances = [
                (str(instance.pk), instance)
                for instance in (self._get_readable_object(model_class, object_id) for object_id in object_ids)
            ]

            # Warnings are collected across every instance before any write, so a bulk transition
            # gates once with one aggregate digest instead of once per instance. Authorization
            # errors are aggregated the same way the write loop below aggregates them, so a bad
            # object_id in the batch is reported the same way whether it fails here or later.
            errors = {}
            warnings_by_object_id = {}
            for oid, instance in id_instances:
                try:
                    transition, resolved_user = self._check_transition_for_instance(instance, transition_code, request)
                except VuedaValidationError as e:
                    errors[oid] = e.detail
                else:
                    warnings = instance.get_transition_warnings(transition, resolved_user)
                    if warnings:
                        warnings_by_object_id[oid] = warnings
            if errors:
                raise VuedaValidationError(errors)
            gate_warnings(request, warnings_by_object_id)

            response_data = {}
            with transaction.atomic():
                for oid, instance in id_instances:
                    try:
                        response_data[oid] = self._apply_transition_to_instance(instance, transition_code, request)
                    except VuedaValidationError as e:
                        errors[oid] = e.detail
            if errors:
                raise VuedaValidationError(errors)
            return Response(response_data)

    def _get_readable_object(self, model_class, object_id):
        """
        Resolve one object of a bulk request, or raise ``Http404``.

        An object the caller cannot read raises the 404 a missing id raises, so a bulk request
        never reports which of its ids exist. Every configured permission class decides, so a
        permission the viewset adds beyond the workflow gates stays authoritative here too.
        """
        instance = get_object_or_404(model_class, pk=object_id)
        self.check_object_permissions(self.request, instance)
        return instance

    @staticmethod
    def _check_transition_for_instance(instance, transition_code, request):
        """
        Validate (permission and availability) that ``transition_code`` can be applied to
        ``instance`` by the requesting user, without writing anything. Raises the same
        ``VuedaValidationError`` shape ``_apply_transition_to_instance`` raises for these failures,
        since this only moves that check earlier (before the warnings gate), it does not change it.
        """
        try:
            return instance.check_transition(transition_code, request.user)
        except (PermissionDenied, InvalidTransitionError) as e:
            raise VuedaValidationError(str(e))

    def _apply_transition_to_instance(self, instance, transition_code, request):
        if not request.dry_run:
            locked_instance = (
                instance.__class__.objects.select_for_update(skip_locked=True).filter(pk=instance.pk).first()
            )
            if not locked_instance:
                raise VuedaValidationError("This object cannot be updated right now. Please try again.")
            instance = locked_instance

        # The object's state may have changed since preflight. Recheck read and any additional
        # permission classes against the instance we will write, while holding its row lock.
        self.check_object_permissions(request, instance)
        transition, resolved_user = self._check_transition_for_instance(instance, transition_code, request)
        state, object_state_revision = instance.apply_checked_transition(transition, resolved_user, request.dry_run)

        data = {
            "new_state": {
                "code": state.code,
                "name": state.name,
            },
            "new_transitions": list(
                instance.available_transitions(request.user).order_by("name").values("code", "name")
            ),
        }
        if object_state_revision:
            data["new_state"]["object_state_revision"] = object_state_revision
        return data
