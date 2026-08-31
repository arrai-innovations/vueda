"""DRF ViewSet for listing and executing workflow transitions."""

__all__ = (
    "PERMISSION_NAMES_MAPPING",
    "WorkflowViewSet",
)

from django.conf import settings
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
from vueda.core.open_api import conditional_extend_schema_decorator
from vueda.core.open_api import conditional_inline_serializer
from vueda.core.open_api import conditional_open_api_types
from vueda.workflow.exceptions import InvalidTransitionError
from vueda.workflow.filtersets import WorkflowFilterSet
from vueda.workflow.models import HasWorkflowModelMixin
from vueda.workflow.models import Workflow
from vueda.workflow.permissions import WorkflowObjectPermissions
from vueda.workflow.serializers import WorkflowSerializer


PERMISSION_NAMES_MAPPING = settings.PERMISSION_NAMES_MAPPING


def _merge_transition_warnings(warnings_by_instance):
    """
    Merge each instance's ``get_transition_warnings`` mapping into one aggregate
    ``{field: [messages]}`` warning set, so a bulk transition gates once with a single digest
    instead of once per instance. Duplicate messages (the common case: every instance in the batch
    trips the same rule) collapse to a single entry per field, keeping the aggregate -- and its
    digest -- stable regardless of batch size. Aggregating this way also means a bulk request's
    `object_ids` never become digest keys, so mixed int/string ids in one request can't crash
    ``compute_warnings_digest``'s ``sort_keys`` comparison the way a per-object mapping would.
    """
    merged = {}
    for warnings in warnings_by_instance:
        for field, messages in warnings.items():
            existing = merged.setdefault(field, [])
            for message in messages:
                if message not in existing:
                    existing.append(message)
    return merged


class WorkflowViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = WorkflowSerializer
    filterset_class = WorkflowFilterSet
    permit_list_expands = ["states", "transitions"]
    permission_classes = [WorkflowObjectPermissions]

    # Moved 'Workflow.objects.all()' to the function, so we can specify a model for workflow actions during open api docs generation.
    def get_queryset(self):
        if hasattr(self, "queryset_model"):
            return self.queryset_model.objects.all()

        return Workflow.objects.all()

    def get_workflow(self):
        return get_object_or_404(
            Workflow,
            content_type__app_label=self.kwargs["app_label"],
            content_type__model=self.kwargs["model"].replace("_", ""),
        )

    def get_object(self):
        if "object_id" in self.request_kwargs:
            return get_object_or_404(self.get_workflow().content_type.model_class(), pk=self.kwargs["object_id"])
        elif "app_label" in self.request_kwargs:
            return self.get_workflow()

    def dispatch(self, request, *args, **kwargs):
        self.request_kwargs = kwargs
        return super().dispatch(request, *args, **kwargs)

    def check_permissions(self, request):
        # permitted_transitions decides its own read_workflow requirement, once it has resolved
        # whether a workflow exists for the target model (see permitted_transitions below). Every
        # other action always requires read_workflow, at minimum, before the model's own
        # read/create/update/delete permission is checked below.
        if self.action != "permitted_transitions" and not request.user.has_perm("vueda_workflow.read_workflow"):
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
                    "current_history_id": serializers.IntegerField(required=False),
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
        user = request.user
        instance = self.get_object()
        if not isinstance(instance, HasWorkflowModelMixin):
            return Response(
                data={"detail": "Object does not have a workflow."},
                exception=Exception("Object does not have a workflow."),
                status=drf_status.HTTP_404_NOT_FOUND,
            )

        permission_read_name = "read"
        if "read" in PERMISSION_NAMES_MAPPING:
            permission_read_name = PERMISSION_NAMES_MAPPING["read"]

        if not user.has_perm(f"{app_label}.{permission_read_name}_{model.replace('_', '')}", obj=instance):
            err_msg = "You do not have permission to perform this action."
            return Response(
                data={"detail": err_msg},
                exception=PermissionDenied(err_msg),
                status=drf_status.HTTP_403_FORBIDDEN,
            )

        state = instance.workflow_state
        response_data = {
            "state": {"code": state.code, "name": state.name},
        }
        if hasattr(instance.object_state, "history"):
            current_history_id = instance.object_state.history.latest().id
            response_data["current_history_id"] = current_history_id
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
        instance = self.get_object()
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
            id_instances = [(object_id, get_object_or_404(model_class, pk=object_id)) for object_id in object_ids]

            # Warnings are collected across every instance before any write, so a bulk transition
            # gates once with one aggregate digest instead of once per instance. Authorization
            # errors are aggregated the same way the write loop below aggregates them, so a bad
            # object_id in the batch is reported the same way whether it fails here or later.
            errors = {}
            warnings_by_instance = []
            for oid, instance in id_instances:
                try:
                    transition, resolved_user = self._check_transition_for_instance(instance, transition_code, request)
                except VuedaValidationError as e:
                    errors[oid] = e.detail
                else:
                    warnings_by_instance.append(instance.get_transition_warnings(transition, resolved_user))
            if errors:
                raise VuedaValidationError(errors)
            gate_warnings(request, _merge_transition_warnings(warnings_by_instance))

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

        transition, resolved_user = self._check_transition_for_instance(instance, transition_code, request)
        state, current_history_id = instance.apply_checked_transition(transition, resolved_user, request.dry_run)

        data = {
            "new_state": {
                "code": state.code,
                "name": state.name,
            },
            "new_transitions": list(
                instance.available_transitions(request.user).order_by("name").values("code", "name")
            ),
        }
        if current_history_id:
            data["new_state"]["current_history_id"] = current_history_id
        return data
