"""AppConfig for the vueda.vdq application."""

__all__ = ("VdqConfig",)

from django.apps import AppConfig
from django.core.exceptions import ImproperlyConfigured

from vueda.core.installed_apps import workflow_is_installed
from vueda.info import register


class VdqConfig(AppConfig):
    name = "vueda.vdq"
    label = "vueda_vdq"
    verbose_name = "VUEDA Dispatch Queue"

    def __init__(self, app_name, app_module):
        super().__init__(app_name, app_module)
        if not workflow_is_installed():
            raise ImproperlyConfigured("'vueda.vdq' requires 'vueda.workflow' in INSTALLED_APPS.")

    def ready(self):
        from vueda.vdq.serializers import QueueItemSerializer
        from vueda.vdq.serializers import SentItemSerializer
        from vueda.vdq.viewsets import SendQueueViewSet
        from vueda.vdq.viewsets import SentItemViewSet

        register(SentItemSerializer, SentItemViewSet)
        register(QueueItemSerializer, SendQueueViewSet)
