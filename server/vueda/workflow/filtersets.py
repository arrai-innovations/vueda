from django_filters import rest_framework as filters

from vueda.workflow.models import State


class HasWorkflowFilterSetMixin(filters.FilterSet):
    workflow_state = filters.ModelChoiceFilter(
        field_name="object_states_proxy__state",
        queryset=State.objects.all(),
    )

    class Meta:
        fields = ["workflow_state"]


class WorkflowFilterSet(filters.FilterSet):
    app_label = filters.CharFilter(field_name="content_type__app_label", lookup_expr="iexact")
    model = filters.CharFilter(field_name="content_type__model", lookup_expr="iexact")

    class Meta:
        fields = ["app_label", "model"]
