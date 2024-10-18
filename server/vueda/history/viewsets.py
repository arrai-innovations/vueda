from django.db.models import Max
from rest_framework.response import Response

from vueda.core.decorators import action
from vueda.history.serializers import DynamicHistoricalSerializer


class SimpleHistoryViewSetMixin:
    def get_historical_fields(self):
        return [
            "history_id",
            "history_date",
            "history_change_reason",
            "history_type",
            "history_user",
            "history_relation",
        ]

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.annotate(current_history_id=Max("history_records__history_id"))

    @action(detail=True)
    def current(self, request, pk=None):
        # history_serializer mix with
        history_id = request.query_params.get("history_id")
        is_current = self.get_queryset().filter(pk=pk, current_history_id=history_id).exists()
        return Response({"current": is_current})

    def diff_fields(self, previous_entry, entry):
        from django.forms import model_to_dict

        different_fields = []
        previous_entry_dict = model_to_dict(previous_entry)
        entry_dict = model_to_dict(entry)
        for name, old_value in previous_entry_dict.items():
            if name in self.get_historical_fields():
                continue
            new_value = entry_dict[name]
            if old_value != new_value:
                different_fields.append(name)

        return different_fields

    @action(detail=True, methods=["get"])
    def history_list(self, *args, **kwargs):
        # if it is slow then we should try making postgres do it.
        instance = self.get_object()
        history_queryset = instance.history.all().order_by("-history_date")
        page = self.paginate_queryset(history_queryset)
        if self.paginator.page.has_next():
            next_page_number = self.paginator.page.next_page_number()
            next_page = self.paginator.page.paginator.page(next_page_number)
            previous_entry = history_queryset[next_page.start_index()]
        else:
            previous_entry = None
        serializer_class = self.get_serializer_class()
        serialized_data = []
        page.reverse()
        for entry in page:
            if previous_entry is None:
                # all the field names on the entry
                different_fields = []
            else:
                different_fields = self.diff_fields(previous_entry, entry)
            serializer = DynamicHistoricalSerializer(
                instance=entry,
                model_serializer_class=serializer_class,
                different_fields=different_fields,
            )
            changes = []
            new_data = serializer.data
            new_data["num_changes"] = len(different_fields)
            if different_fields:
                previous_serializer = DynamicHistoricalSerializer(
                    instance=previous_entry,
                    model_serializer_class=serializer_class,
                    different_fields=different_fields,
                )
                old_data = previous_serializer.data
                for field in different_fields:
                    copy = {
                        "new": new_data[field],
                        "old": old_data[field],
                        "field": field,
                    }
                    changes.append(copy)
                new_data["changes"] = changes
                new_data.pop(field)

            previous_entry = entry
            serialized_data.append(new_data)

        serialized_data.reverse()

        return self.get_paginated_response(serialized_data)
