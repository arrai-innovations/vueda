"""ViewSets for the VDQ send queue and sent items."""

__all__ = (
    "DefaultSendQueueViewSet",
    "DefaultSentItemViewSet",
    "SendQueueViewSet",
    "SentItemViewSet",
)

from django.conf import settings
from django.db import transaction
from django.db.transaction import atomic
from rest_framework import status as drf_status
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from vueda.core.decorators import action
from vueda.core.open_api import conditional_extend_schema_decorator
from vueda.core.permissions import ObjectPermissions
from vueda.core.serializers import PrimaryKeyListSerializer
from vueda.core.viewsets import VuedaReadOnlyViewSet
from vueda.vdq.constants import QUEUE_ITEM_DONE_STATES
from vueda.vdq.filtersets import SendQueueFilterSet
from vueda.vdq.filtersets import SentQueueFilterSet
from vueda.vdq.models import QueueItem
from vueda.vdq.models import SentItem
from vueda.vdq.permissions import QueueItemObjectPermission
from vueda.vdq.schedulers import schedule_queue_item
from vueda.vdq.serializers import QueueItemSerializer
from vueda.vdq.serializers import SentItemSerializer
from vueda.workflow.views import HasWorkflowViewMixin


class DefaultSendQueueViewSet(HasWorkflowViewMixin, VuedaReadOnlyViewSet):
    queryset = QueueItem.objects.select_related("receiver").order_by("queued")
    serializer_class = QueueItemSerializer
    permission_classes = [ObjectPermissions]
    search_fields = ["receiver__name", "receiver__email", "result"]
    ordering_fields = ["queued", "last_updated"]
    filterset_class = SendQueueFilterSet
    permit_list_expands = ["anymail", "sender", "receiver", "sms"]

    def get_queryset(self):
        queryset = super().get_queryset()
        if not hasattr(self, "request"):
            return queryset

        if "pk" in self.kwargs:
            return queryset
        return queryset.exclude(object_states_proxy__state__code__in=QUEUE_ITEM_DONE_STATES)


SendQueueViewSet = getattr(settings, "SEND_QUEUE_VIEWSET", DefaultSendQueueViewSet)


class DefaultSentItemViewSet(HasWorkflowViewMixin, VuedaReadOnlyViewSet):
    queryset = SentItem.objects.select_related("receiver").order_by("queued")
    serializer_class = SentItemSerializer
    permission_classes = [QueueItemObjectPermission]
    search_fields = ["receiver__name", "receiver__email", "result"]
    ordering_fields = ["queued", "last_updated"]
    filterset_class = SentQueueFilterSet
    permit_list_expands = ["anymail", "sender", "receiver", "sms"]

    @conditional_extend_schema_decorator(summary="Resend sent item(s)")
    @atomic
    @action(detail=True, bulk=True, methods=["post"])
    def resend(self, request, pk=None):
        if pk:
            queue_item = self.get_object()
            new_queue_item = queue_item.clone()
            schedule_queue_item(new_queue_item)

        else:
            with transaction.atomic():
                serializer = PrimaryKeyListSerializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                pks = serializer.validated_data["pks"]
                for pk in pks:
                    queue_item = get_object_or_404(self.queryset, pk=pk)
                    new_queue_item = queue_item.clone()
                    schedule_queue_item(new_queue_item)

        return Response(status=drf_status.HTTP_200_OK, data={"message": "Successfully Queued."})


SentItemViewSet = getattr(settings, "SENT_ITEM_VIEWSET", DefaultSentItemViewSet)
