from django.apps import AppConfig

from vueda.info import register


class UserConfig(AppConfig):
    name = "vueda.user"
    label = "vueda_user"
    verbose_name = "VUEDA User"

    def ready(self):
        from dj_rest_auth.views import LoginView
        from dj_rest_auth.views import LogoutView

        from vueda.core.open_api import conditional_extend_schema_decorator

        decorator = conditional_extend_schema_decorator(
            summary="Login user",
        )
        decorator(LoginView)
        decorator = conditional_extend_schema_decorator(
            summary="Logout user",
        )
        decorator(LogoutView)
        from vueda.user.serializers import TOTPDeviceSerializer
        from vueda.user.viewsets import TOTPDeviceViewSet

        register(TOTPDeviceSerializer, TOTPDeviceViewSet)
