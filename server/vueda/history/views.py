"""Views for history-aware who-is and object history retrieval."""

__all__ = (
    "PERMISSION_NAMES_MAPPING",
    "GetObjectHistoryView",
    "WhoIsView",
)

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Max
from django.db.models import OuterRef
from django.db.models import Subquery
from rest_framework import status as drf_status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from vueda.core.open_api import conditional_extend_schema_decorator
from vueda.history.serializers.users import WhoIsSerializer
from vueda.user.views import WhoIsView as CoreWhoIsView
from vueda.workflow.views import WorkflowView


PERMISSION_NAMES_MAPPING = settings.PERMISSION_NAMES_MAPPING


class WhoIsView(CoreWhoIsView):
    """
    This decoupling helps make the history app optional.
    """

    serializer_class = WhoIsSerializer

    def get_object(self):
        queryset = get_user_model().objects.filter(pk=self.request.user.pk)
        return queryset.annotate(
            current_history_id=Subquery(
                queryset.filter(history_records__id=OuterRef("pk"))
                .annotate(current_history_id=Max("history_records__history_id"))
                .values("current_history_id")
            )
        ).get(pk=self.request.user.pk)


@conditional_extend_schema_decorator(summary="Get object history", description="")
class GetObjectHistoryView(WorkflowView):
    def get(self, request, *args, **kwargs):
        user = request.user
        app_label = kwargs["app_label"]
        model = kwargs["model"]
        if not hasattr(self.object.object_state, "history"):
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
                self.object.object_state.history.values(
                    "history_id", "state__code", "history_change_reason", "history_date", "history_user"
                )
            )
        )
