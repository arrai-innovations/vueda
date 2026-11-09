"""VUEDA permissions as an object stream visibility policy."""

__all__ = ("VuedaVisibilityPolicy",)

from django.conf import settings
from django.http import HttpRequest
from rest_framework.request import Request

from vueda.core.permissions import filter_rows_for_user
from vueda.core.permissions import has_matching_state_grant


def _permission(model, action):
    """Return the model permission that ``action`` needs, named as this installation names it."""
    name = settings.PERMISSION_NAMES_MAPPING.get(action, action)
    return f"{model._meta.app_label}.{name}_{model._meta.model_name}"


def _viewset_queryset(viewset_class, user):
    """
    Return what a viewset's ``get_queryset()`` returns for ``user``, outside any HTTP request.

    The viewset gets a GET request for the user, with no query parameters, no URL keyword arguments,
    and no action. ``get_queryset()`` therefore applies the scoping that depends on the user, and
    none that depends on a particular request.
    """
    http_request = HttpRequest()
    http_request.method = "GET"
    request = Request(http_request)
    request.user = user
    view = viewset_class()
    view.request = request
    view.args = ()
    view.kwargs = {}
    view.format_kwarg = None
    view.action = None
    return view.get_queryset()


class VuedaVisibilityPolicy:
    """
    Scope a subscription to the rows that a user may read, with the checks that the REST API applies.

    The user needs the model permission for ``action``, as a request to the model's endpoint does.
    On a workflow model, a ``StatePermission`` grant can stand in for it, and the state rules then
    decide row by row. ``filter_rows_for_user`` applies the model's ``RowLevelPermissions`` and the
    workflow state rules.

    The rows start from the viewset's ``get_queryset()`` when a viewset is given, so scoping that
    the viewset applies there, such as to the signed-in user's own rows, also limits subscriptions.
    An explicit ``queryset`` replaces that starting point.

    ``viewset`` is the viewset class whose ``get_queryset()`` gives the starting rows. ``queryset``
    gives them directly, and takes precedence over ``viewset``. With neither, the rows start from the
    model's default manager.

    Anonymous connections see nothing. A websocket that failed to authenticate does not fall back to
    the model's default manager.
    """

    def __init__(self, *, viewset=None, queryset=None):
        self.viewset = viewset
        self.queryset = queryset

    def get_queryset(self, user, model, action="read"):
        queryset = self._starting_queryset(user, model)
        if user is None or not user.is_authenticated:
            return queryset.none()
        permission = _permission(model, action)
        if not user.has_perm(permission) and not has_matching_state_grant(model, user, [permission]):
            return queryset.none()
        return filter_rows_for_user(queryset, user, perm_type=action)

    def _starting_queryset(self, user, model):
        if self.queryset is not None:
            return self.queryset.all()
        if self.viewset is not None and user is not None and user.is_authenticated:
            return _viewset_queryset(self.viewset, user)
        return model._default_manager.all()
