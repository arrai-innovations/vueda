from django_filters import rest_framework as filters

from vueda.models.workflow import State


class HasWorkflowFilterSetMixin(filters.FilterSet):
    workflow_state = filters.ModelChoiceFilter(
        field_name="object_states_proxy__state",
        queryset=State.objects.all(),
    )

    class Meta:
        fields = ["workflow_state"]
