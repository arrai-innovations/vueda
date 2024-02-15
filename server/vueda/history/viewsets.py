from django.db.models import Max
from rest_framework.decorators import action
from rest_framework.response import Response


class SimpleHistoryViewSetMixin:
    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.annotate(current_history_id=Max("history_records__history_id"))

    @action(detail=True)
    def current(self, request, pk=None):
        history_id = request.query_params.get("history_id")
        is_current = self.get_queryset().filter(pk=pk, current_history_id=history_id).exists()
        return Response({"current": is_current})
