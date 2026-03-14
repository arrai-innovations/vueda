"""AppConfig for the vueda.release application."""

__all__ = ("ReleaseConfig",)

from django.apps import AppConfig

from vueda.info import register


class ReleaseConfig(AppConfig):
    name = "vueda.release"
    label = "vueda_release"
    verbose_name = "VUEDA Release"

    def ready(self):
        from vueda.release.serializers import ReleaseNoteSerializer
        from vueda.release.viewsets import ReleaseNoteViewSet

        register(ReleaseNoteSerializer, ReleaseNoteViewSet)
