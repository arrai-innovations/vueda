from typing import Optional
from typing import Union

from django.contrib.contenttypes.models import ContentType
from django.db.models import Q
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import DjangoObjectPermissions


class VUEDAObjectPermission(DjangoObjectPermissions):
    """
    This is a custom permission class that extends DjangoObjectPermissions.
    We have a default perms_map more in line with the way we want to use permissions,
    and for CRUDL operations vs the default DjangoObjectPermissions perms_map
    (which is only add, change, delete, not view).

    Note: This class wants the `app_label` and `model` to be provided in the view's kwargs.
    This is typically done by using the `IncludeAppInRouteNameRouter` router, which includes
    the app name and model name in the route name. Doing so will make this class not make
    a queryset just to get the model class, which is a bit of a waste.
    """

    perms_map = {
        "GET": ["%(app_label)s.read_%(model_name)s"],
        "OPTIONS": [],
        "HEAD": [],
        "POST": ["%(app_label)s.create_%(model_name)s"],
        "PUT": ["%(app_label)s.update_%(model_name)s"],
        "PATCH": ["%(app_label)s.update_%(model_name)s"],
        "DELETE": ["%(app_label)s.delete_%(model_name)s"],
    }

    def _queryset(self, view):
        """
        The way this is used in DjangoObjectPermissions and DjangoModelPermissions
        right now is to just use the queryset to get the model_class.

        That kinda seems round about, especially for this class were we have the content_type_id.
        """
        # future: Since this is a private method, we should check this during updates to DRF.
        try:
            # get the app_label & model being requested by the user.
            app_label = view.kwargs["app_label"]
            model = view.kwargs["model"]
        except KeyError:
            # if the view doesn't have kwargs, then use the regular method
            return super()._queryset(view)
        # and get the model class for that app_label & model
        content_type = get_object_or_404(ContentType, app_label=app_label, model=model.replace("_", ""))
        model_class = content_type.model_class()
        # and return the queryset for that model class
        return model_class.objects.all()


DEFAULT = object()


class BaseRowLevelPermissions:
    @classmethod
    def check_instance(cls, model, obj, perm, user, perm_type) -> Optional[bool]:
        """
        True if the user has the permission, False if the user does not have the permission, None if the check is not
        applicable due to there being no row level permissions for the model.
        """
        # users should implement this method
        if user.is_superuser:
            return None
        return None

    @classmethod
    def check_queryset(cls, queryset, perm, user, perm_type) -> Union[Q, bool, None]:
        """
        Return of None means do not filter based on row level permissions.
        Return of True means the user has the permission without needing to check the rows.
        Return of False means the user does not have the permission, and we can stop checking.
        Return of Q means we need to filter the rows based on the row level permissions.
        """
        # users should implement this method
        if user.is_superuser:
            return None
        return None
