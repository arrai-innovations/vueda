"""Django-filter FilterSets for workflow state filtering."""

__all__ = (
    "HasWorkflowFilterSetMixin",
    "WorkflowFilterSet",
)

from django_filters import rest_framework as filters

from vueda.core.filters import ModelChoiceArrayFilter
from vueda.workflow.models import State


class HasWorkflowFilterSetMixin(filters.FilterSet):
    workflow_state = ModelChoiceArrayFilter(
        field_name="object_states_proxy__state",
        queryset=State.objects.all(),
        label="Status",
    )

    class Meta:
        fields = ["workflow_state"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        states = self.queryset.values_list("object_states_proxy__state", flat=True).distinct()
        if states.exists():
            self.filters["workflow_state"].queryset = State.objects.filter(pk__in=states)


class WorkflowFilterSet(filters.FilterSet):
    app_label = filters.CharFilter(field_name="content_type__app_label", lookup_expr="iexact")
    model = filters.CharFilter(field_name="content_type__model", lookup_expr="iexact")

    class Meta:
        fields = ["app_label", "model"]
