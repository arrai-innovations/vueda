"""Django-filter FilterSets for workflow state filtering."""

__all__ = (
    "WORKFLOW_STATE_FILTER",
    "WorkflowFilterSet",
    "workflow_state_filter",
)

from django_filters import rest_framework as filters

from vueda.core.filters import ModelChoiceArrayFilter
from vueda.workflow.models import State


# The filter a workflow model's filtersets receive, under this name.
WORKFLOW_STATE_FILTER = "workflow_state"


def workflow_state_filter(model):
    """Return a new filter on the object's current workflow state.

    ``VuedaFilterSet.get_filters`` adds it to a filterset whose model enables ``class Vueda.Workflow``
    and does not declare a filter of the same name.

    ``model`` is the model that the filterset lists. The filter accepts the primary key of any state
    in that model's workflow. A proxy model uses the workflow of its concrete model. A state that no
    row is in is still accepted, and the request then matches no rows. A state from another model's
    workflow is rejected.
    """
    meta = model._meta.concrete_model._meta
    filter_ = ModelChoiceArrayFilter(
        field_name="object_states_proxy__state",
        queryset=State.objects.filter(
            workflow__content_type__app_label=meta.app_label,
            workflow__content_type__model=meta.model_name,
        ),
        label="Status",
    )
    filter_.vueda_workflow_state = True
    return filter_


class WorkflowFilterSet(filters.FilterSet):
    app_label = filters.CharFilter(field_name="content_type__app_label", lookup_expr="iexact")
    model = filters.CharFilter(field_name="content_type__model", lookup_expr="iexact")

    class Meta:
        fields = ["app_label", "model"]
