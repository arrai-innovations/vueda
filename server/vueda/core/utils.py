from django.apps.registry import Apps
from django.contrib.auth import get_user_model


User = get_user_model()
DEFAULT = object()


def get_system_user(apps: Apps = DEFAULT) -> User:
    if apps is not DEFAULT:
        return apps.get_model("users", "User").objects.get(is_system=True)
    return User.objects.get(is_system=True)
