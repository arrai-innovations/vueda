from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied
from django.db.models import Max
from rest_framework import status as drf_status
from rest_framework.response import Response

from vueda.history.serialiers import WhoIsSerializer
from vueda.user.views import WhoIsView as CoreWhoIsView
from vueda.workflow.views import WorkflowView


class WhoIsView(CoreWhoIsView):
    """
    This decoupling helps make the history app optional.
    """

    serializer_class = WhoIsSerializer

    def get_object(self):
        return (
            get_user_model()
            .objects.annotate(current_history_id=Max("history_records__history_id"))
            .get(pk=self.request.user.pk)
        )


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
        if not user.has_perm(f"{app_label}.read_{model.replace('_', '')}", obj=self.object):
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
