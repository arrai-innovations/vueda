"""ViewSet mixin for exposing django-simple-history list and diff actions."""

__all__ = ("SimpleHistoryViewSetMixin",)

from django.contrib.auth import get_user_model
from django.db.models import Max
from django.db.models import OuterRef
from django.db.models import Subquery
from rest_framework.response import Response

from vueda.core.decorators import action
from vueda.history.serializers import DynamicHistoricalSerializer
from vueda.history.serializers.mixins import HISTORICAL_FIELDS


class SimpleHistoryViewSetMixin:
    def get_historical_fields(self):
        return HISTORICAL_FIELDS

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
    def history_list(self, request, pk=None):
        # if it is slow then we should try making postgres do it.
        user_model = get_user_model()
        user_cache = {}
        instance = self.get_object()
        history_queryset = instance.history.order_by("-history_date")
        page = self.paginate_queryset(history_queryset)
        if self.paginator.page.has_next():
            next_page_number = self.paginator.page.next_page_number()
            next_page = self.paginator.page.paginator.page(next_page_number)
            previous_entry = history_queryset[next_page.start_index() - 1]
        else:
            previous_entry = None
        serializer_class = self.get_serializer_class()
        serialized_data = []
        page.reverse()
        for entry in page:
            if previous_entry is None:
                # all the field names on the entry
                different_fields = []
                delta = None
            else:
                delta = entry.diff_against(previous_entry, foreign_keys_are_objs=True)
                different_fields = delta.changed_fields

            serializer = DynamicHistoricalSerializer(
                instance=entry,
                model_serializer_class=serializer_class,
                different_fields=different_fields,
            )
            new_data = serializer.data
            user_id = new_data["history_user"]
            if user_id:
                if user_id not in user_cache:
                    user_cache[user_id] = user_model.objects.get(pk=user_id).formatted_name
                new_data["history_user"] = user_cache[user_id]
            new_data["num_changes"] = len(different_fields)
            changes = []
            if different_fields:
                for change in delta.changes:
                    if hasattr(change.new, "_meta") or hasattr(change.old, "_meta"):
                        copy = {
                            "new": change.new.formatted_name if hasattr(change.new, "_meta") else change.new.pk,
                            "old": change.old.formatted_name if hasattr(change.old, "_meta") else change.old.pk,
                            "field": change.field,
                        }
                    else:
                        copy = {
                            "new": change.new,
                            "old": change.old,
                            "field": change.field,
                        }
                    changes.append(copy)

                new_data["changes"] = changes
            elif delta:
                copy = {
                    "new": "",
                    "old": "",
                    "field": "related object updated",
                }
                new_data["changes"] = changes
                new_data["num_changes"] = 1
                changes.append(copy)
            previous_entry = entry
            serialized_data.append(new_data)

        serialized_data.reverse()

        return self.get_paginated_response(serialized_data)
