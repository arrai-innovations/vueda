"""VUEDA row-level permissions as an object stream visibility policy."""

__all__ = ("VuedaVisibilityPolicy",)

from vueda.core.permissions import filter_rows_for_user


class VuedaVisibilityPolicy:
    """
    Scope a queryset to the rows a user may act on, using VUEDA's own rules.

    This is the same filtering a list endpoint applies, so a subscription and a REST read agree on
    membership. ``action`` is VUEDA's permission type: ``read`` checks ``read_<model>``, and a
    workflow's ``StatePermission`` rules narrow it per state.

    Anonymous connections see nothing. A websocket that failed to authenticate should not fall back
    to the model's default manager.
    """

    def __init__(self, *, queryset=None):
        self.queryset = queryset

    def get_queryset(self, user, model, action="read"):
        queryset = self.queryset.all() if self.queryset is not None else model._default_manager.all()
        if user is None or not user.is_authenticated:
            return queryset.none()
        return filter_rows_for_user(queryset, user, perm_type=action)
