"""Views for history-aware who-is and object history retrieval."""

__all__ = (
    "PERMISSION_NAMES_MAPPING",
    "GetObjectHistoryView",
    "WhoIsView",
)

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.db.models import Max
from django.db.models import OuterRef
from django.db.models import Subquery
from rest_framework import serializers
from rest_framework import status as drf_status
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from vueda.core.installed_apps import workflow_is_installed
from vueda.core.open_api import conditional_extend_schema_decorator
from vueda.core.open_api import conditional_open_api_parameter
from vueda.core.permissions import DjangoObjectPermissions
from vueda.user.views import WhoIsView as CoreWhoIsView


PERMISSION_NAMES_MAPPING = settings.PERMISSION_NAMES_MAPPING


class WhoIsView(CoreWhoIsView):
    """
    This decoupling helps make the history app optional.
    """

    def get_serializer_class(self):
        from vueda.history.serializers.users import WhoIsSerializer

        return WhoIsSerializer

    def get_object(self):
        queryset = get_user_model().objects.filter(pk=self.request.user.pk)
        return queryset.annotate(
            current_history_id=Subquery(
                queryset.filter(history_records__id=OuterRef("pk"))
                .annotate(current_history_id=Max("history_records__history_id"))
                .values("current_history_id")
            )
        ).get(pk=self.request.user.pk)


class DynamicObjectPermissions(DjangoObjectPermissions):
    """CRUDL permissions for endpoints that select their model from URL arguments."""

    perms_map = {
        "GET": ["%(app_label)s.read_%(model_name)s"],
        "OPTIONS": [],
        "HEAD": [],
        "POST": ["%(app_label)s.create_%(model_name)s"],
        "PUT": ["%(app_label)s.update_%(model_name)s"],
        "PATCH": ["%(app_label)s.read_%(model_name)s"],
        "DELETE": ["%(app_label)s.delete_%(model_name)s"],
    }

    def _queryset(self, view):
        app_label = view.kwargs.get("app_label") or view.request.GET.get("app_label")
        model = view.kwargs.get("model") or view.request.GET.get("model")
        content_type = get_object_or_404(ContentType, app_label=app_label, model=model.replace("_", ""))
        model_class = content_type.model_class()
        return model_class.objects.all()

    def has_permission(self, request, view):
        if workflow_is_installed():
            from vueda.workflow.models import HasWorkflowModelMixin
            from vueda.workflow.models import StatePermission
            from vueda.workflow.models import Workflow

            model = self._queryset(view).model
            if issubclass(model, HasWorkflowModelMixin):
                workflow = Workflow.objects.filter(content_type=model.get_content_type()).first()
                if StatePermission.objects.filter(state__workflow=workflow).exists():
                    return True
        return super().has_permission(request, view)


class DynamicObjectView(APIView):
    """APIView helper for endpoints that operate on arbitrary registered models."""

    permission_classes = [DynamicObjectPermissions]

    def get_queryset(self):
        app_label = self.kwargs.get("app_label")
        model = self.kwargs.get("model")
        content_type = get_object_or_404(ContentType, app_label=app_label, model=model.replace("_", ""))
        model_class = content_type.model_class()
        return model_class.objects.all()

    def get_object(self):
        object_id = self.kwargs.get("object_id")
        if object_id is None:
            return None
        return get_object_or_404(self.get_queryset(), pk=object_id)

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.object = self.get_object()


class ObjectHistoryRecordSerializer(serializers.Serializer):
    history_id = serializers.IntegerField()
    state__code = serializers.CharField(allow_null=True)
    history_change_reason = serializers.CharField(allow_null=True)
    history_date = serializers.DateTimeField()
    history_user = serializers.IntegerField(allow_null=True)


class GetObjectHistoryView(DynamicObjectView):
    serializer_class = ObjectHistoryRecordSerializer

    @conditional_extend_schema_decorator(
        summary="Get object history",
        description="",
        parameters=[
            conditional_open_api_parameter(
                name="app_label",
                type=str,
                location="path",
                required=True,
                pattern="^[a-zA-Z0-9_]+$",
            ),
            conditional_open_api_parameter(
                name="model",
                type=str,
                location="path",
                required=True,
                pattern="^[a-zA-Z0-9_]+$",
            ),
            conditional_open_api_parameter(
                name="object_id",
                type=int,
                location="path",
                required=True,
            ),
        ],
        responses={200: ObjectHistoryRecordSerializer(many=True)},
    )
    def get(self, request, *args, **kwargs):
        user = request.user
        app_label = kwargs["app_label"]
        model = kwargs["model"]
        object_state = getattr(self.object, "object_state", None)
        if object_state is None or not hasattr(object_state, "history"):
            return Response(
                data={"detail": "Object does not have a history."},
                exception=Exception("Object does not have a history."),
                status=drf_status.HTTP_404_NOT_FOUND,
            )

        permission_read_name = "read"
        if "read" in PERMISSION_NAMES_MAPPING:
            permission_read_name = PERMISSION_NAMES_MAPPING["read"]

        if not user.has_perm(f"{app_label}.{permission_read_name}_{model.replace('_', '')}", obj=self.object):
            err_msg = "You do not have permission to perform this action."
            return Response(
                data={"detail": err_msg},
                exception=PermissionDenied(err_msg),
                status=drf_status.HTTP_403_FORBIDDEN,
            )
        return Response(
            list(
                object_state.history.values(
                    "history_id", "state__code", "history_change_reason", "history_date", "history_user"
                )
            )
        )
