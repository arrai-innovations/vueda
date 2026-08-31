"""AppConfig for the optional app boundary fixture."""

from django.apps import AppConfig

from vueda.info import register


class OptionalAppsConfig(AppConfig):
    name = "tests.optional_apps"
    label = "optional_apps"

    def ready(self):
        from tests.optional_apps.serializers import TicketSerializer
        from tests.optional_apps.viewsets import TicketViewSet

        register(TicketSerializer, TicketViewSet)
