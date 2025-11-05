from django.apps import AppConfig

from vueda.info import register


class VdqConfig(AppConfig):
    name = "vueda.vdq"
    label = "vueda_vdq"
    verbose_name = "VUEDA Dispatch Queue"

    def ready(self):
        from vueda.vdq.serializers import QueueItemSerializer
        from vueda.vdq.serializers import SentItemSerializer
        from vueda.vdq.viewsets import SendQueueViewSet
        from vueda.vdq.viewsets import SentItemViewSet

        register(SentItemSerializer, SentItemViewSet)
        register(QueueItemSerializer, SendQueueViewSet)
