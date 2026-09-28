"""Django-filter FilterSets for workflow state filtering."""

__all__ = (
    "WORKFLOW_STATE_FILTER",
    "WorkflowFilterSet",
    "narrow_workflow_state_filter",
    "workflow_state_filter",
)

from django_filters import rest_framework as filters

from vueda.core.filters import ModelChoiceArrayFilter
from vueda.workflow.models import State


# The filter a workflow model's filtersets receive, under this name.
WORKFLOW_STATE_FILTER = "workflow_state"


def workflow_state_filter():
    """Return a new filter on the object's current workflow state.

    ``VuedaFilterSet.get_filters`` adds it to a filterset whose model enables ``class Vueda.Workflow``
    and does not declare a filter of the same name.
    """
    filter_ = ModelChoiceArrayFilter(
        field_name="object_states_proxy__state",
        queryset=State.objects.all(),
        label="Status",
    )
    filter_.vueda_workflow_state = True
    return filter_


def narrow_workflow_state_filter(filterset):
    """Limit the workflow state filter's choices to states that rows in ``filterset.queryset`` are in.

    Only the filter ``workflow_state_filter`` built is narrowed. A filterset that declares its own
    ``workflow_state`` filter keeps the choices it declared.
    """
    filter_ = filterset.filters.get(WORKFLOW_STATE_FILTER)
    if not getattr(filter_, "vueda_workflow_state", False):
        return
    states = filterset.queryset.values_list("object_states_proxy__state", flat=True).distinct()
    if states.exists():
        filter_.queryset = State.objects.filter(pk__in=states)


class WorkflowFilterSet(filters.FilterSet):
    app_label = filters.CharFilter(field_name="content_type__app_label", lookup_expr="iexact")
    model = filters.CharFilter(field_name="content_type__model", lookup_expr="iexact")

    class Meta:
        fields = ["app_label", "model"]
