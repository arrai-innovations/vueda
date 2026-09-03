"""ViewSet mixins exposing an object's history as the actions that produced it."""

__all__ = (
    "HistoryActionViewSetMixin",
    "VuedaHistoryViewSet",
)

from vueda.core.decorators import action
from vueda.core.viewsets import VuedaViewSet
from vueda.history.actions import build_action_groups
from vueda.history.queries import action_groups_for
from vueda.history.queries import events_in_groups
from vueda.history.serializers.actions import HistoryActionGroupSerializer


class HistoryActionViewSetMixin:
    """Return an object's history as the user actions behind it.

    A page is a page of actions. One action that wrote several rows stays whole, because the
    grouping and the visibility filter both run in the database before the paginator sees anything.
    """

    @action(detail=True, methods=["get"])
    def history_list(self, request, pk=None):
        # get_object() authorizes the requested object, which is what makes its own events visible.
        instance = self.get_object()
        groups = action_groups_for(instance, request.user)
        page = self.paginate_queryset(groups)
        events = events_in_groups(instance, request.user, [group["group_key"] for group in page])
        serializer = HistoryActionGroupSerializer(build_action_groups(instance, page, events), many=True)
        return self.get_paginated_response(serializer.data)


class VuedaHistoryViewSet(HistoryActionViewSetMixin, VuedaViewSet):
    """``VuedaViewSet`` extended with the history endpoints."""
