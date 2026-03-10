"""DRF ViewSet for listing and executing workflow transitions."""

__all__ = (
    "PERMISSION_NAMES_MAPPING",
    "WorkflowViewSet",
)

from django.conf import settings
from django.db import transaction
from django.http import Http404
from rest_framework import mixins
from rest_framework import status as drf_status
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from vueda.core.decorators import action
from vueda.core.exceptions import VuedaValidationError
from vueda.workflow.exceptions import InvalidTransitionError
from vueda.workflow.filtersets import WorkflowFilterSet
from vueda.workflow.models import HasWorkflowModelMixin
from vueda.workflow.models import Workflow
from vueda.workflow.permissions import WorkflowObjectPermissions
from vueda.workflow.serializers import WorkflowSerializer


PERMISSION_NAMES_MAPPING = settings.PERMISSION_NAMES_MAPPING


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
            Workflow, content_type__app_label=self.kwargs["app_label"], content_type__model=self.kwargs["model"]
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
        # you need Workflow read permission to get / list / action the workflow, at minimum
        if not request.user.has_perm("vueda_workflow.read_workflow"):
            raise PermissionDenied("You do not have permission to perform this action.")
        return super().check_permissions(request)

    @action(detail=True, methods=["get"], url_path=r"object-state/(?P<object_id>[^/.]+)")
    def object_state(self, request, *args, **kwargs):
        user = request.user
        app_label = kwargs["app_label"]
        model = kwargs["model"]
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

    @action(detail=True, methods=["get"])
    def permitted_transitions(self, request, *args, **kwargs):
        try:
            workflow = self.get_workflow()
        except Http404:
            return Response([])
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

    @action(detail=True, methods=["get"], url_path=r"object-transitions/(?P<object_id>[^/.]+)")
    def object_transitions(self, request, *args, **kwargs):
        instance = self.get_object()
        return Response(list(instance.available_transitions(request.user).order_by("name").values("code", "name")))

    @action(detail=True, bulk=True, methods=["patch"], url_path=r"execute-transition(?:/(?P<object_id>[^/.]+))?")
    def execute_transition(self, request, *args, **kwargs):
        transition_code = request.data.get("transition_code")
        if "object_id" in self.request_kwargs:
            instance = self.get_object()
            with transaction.atomic():
                if not request.dry_run:
                    locked_instance = (
                        instance.__class__.objects.select_for_update(skip_locked=True).filter(pk=instance.pk).first()
                    )
                    if not locked_instance:
                        raise VuedaValidationError("This object cannot be updated right now. Please try again.")

                    instance = locked_instance

                # apply_transition does the permission checks
                try:
                    state, current_history_id = instance.apply_transition(
                        transition_code, user=request.user, dry_run=request.dry_run
                    )

                    response_data = {
                        "new_state": {
                            "code": state.code,
                            "name": state.name,
                        },
                        "new_transitions": list(
                            instance.available_transitions(request.user).order_by("name").values("code", "name")
                        ),
                    }
                    if current_history_id:
                        response_data["new_state"]["current_history_id"] = current_history_id
                except (PermissionDenied, InvalidTransitionError) as e:
                    raise VuedaValidationError(str(e))

            return Response(response_data)
        else:
            object_ids = request.data.get("object_ids", [])
            if not isinstance(object_ids, list):
                raise VuedaValidationError({"object_ids": ["Must be a list of primary keys."]})
            response_data = {}
            error = {}
            with transaction.atomic():
                for object_id in object_ids:
                    instance = get_object_or_404(self.get_workflow().content_type.model_class(), pk=object_id)
                    if not request.dry_run:
                        locked_instance = (
                            instance.__class__.objects.select_for_update(skip_locked=True)
                            .filter(pk=instance.pk)
                            .first()
                        )
                        if not locked_instance:
                            error[object_id] = ["This object cannot be updated right now. Please try again."]
                            continue
                        instance = locked_instance
                    try:
                        state, current_history_id = instance.apply_transition(
                            transition_code, user=request.user, dry_run=request.dry_run
                        )
                    except (PermissionDenied, InvalidTransitionError) as e:
                        error[object_id] = [str(e)]
                        continue
                    except VuedaValidationError as e:
                        error[object_id] = e.detail
                        continue

                    response_data[object_id] = {
                        "new_state": {
                            "code": state.code,
                            "name": state.name,
                        },
                        "new_transitions": list(
                            instance.available_transitions(request.user).order_by("name").values("code", "name")
                        ),
                    }
                    if current_history_id:
                        response_data[object_id]["new_state"]["current_history_id"] = current_history_id
            if error:
                raise VuedaValidationError(error)
            return Response(response_data)
