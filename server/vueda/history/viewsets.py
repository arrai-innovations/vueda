"""ViewSet mixins exposing an object's history as the actions that produced it."""

__all__ = (
    "HistoryActionViewSetMixin",
    "SimpleHistoryViewSetMixin",
    "VuedaHistoryViewSet",
)

from django.db.models import Max
from django.db.models import OuterRef
from django.db.models import Subquery
from rest_framework.response import Response

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


class SimpleHistoryViewSetMixin(HistoryActionViewSetMixin):
    """Adds the pre-v3 per-object revision token to the action-grouped history.

    The token and its endpoint still come from django-simple-history. They are replaced by
    ``object_revision`` on the ordinary serializer.
    """

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.annotate(
            current_history_id=Subquery(
                queryset.filter(history_records__id=OuterRef("pk"))
                .annotate(current_history_id=Max("history_records__history_id"))
                .values("current_history_id")
            )
        )

    @action(detail=True)
    def current(self, request, pk=None):
        history_id = request.query_params.get("history_id")
        is_current = self.get_queryset().filter(pk=pk, current_history_id=history_id).exists()
        return Response({"current": is_current})


class VuedaHistoryViewSet(SimpleHistoryViewSetMixin, VuedaViewSet):
    """``VuedaViewSet`` extended with the history endpoints."""
