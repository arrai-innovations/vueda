"""DRF serializers and mixins for workflow state and available transitions."""

__all__ = (
    "WORKFLOW_SERIALIZER_FIELDS",
    "WORKFLOW_STATE_FIELDS",
    "StateSerializer",
    "TransitionSerializer",
    "WorkflowSerializer",
    "workflow_field_model_info",
    "workflow_serializer_fields",
)

from django.conf import settings
from rest_flex_fields2.serializers import FlexFieldsSerializerMixin
from rest_framework import serializers as drf_serializers

from vueda.core.serializers import VuedaExpandableFieldsSerializerMixin
from vueda.workflow.fields import AvailableTransitionField
from vueda.workflow.models import State
from vueda.workflow.models import Transition
from vueda.workflow.models import Workflow


# Fields a workflow model's serializers receive. They are read-only views of the object's current
# state and the transitions from it.
WORKFLOW_STATE_FIELDS = ("workflow_state_code", "workflow_state_name")
WORKFLOW_SERIALIZER_FIELDS = (*WORKFLOW_STATE_FIELDS, "valid_transitions")


def workflow_serializer_fields():
    """Return new instances of the fields that a workflow model's serializers receive.

    ``WorkflowFieldsSerializerMixin`` adds them to each ``VuedaSerializer`` of a model that enables
    ``class Vueda.Workflow``, unless its ``Meta`` sets ``workflow_fields = False``. A default list shows the state's name. Its code repeats that as a
    machine value, and the per-record transitions belong on the detail view.
    """
    return {
        "workflow_state_code": drf_serializers.CharField(
            source="workflow_state.code", read_only=True, style={"list_default": False}
        ),
        "workflow_state_name": drf_serializers.CharField(source="workflow_state.name", read_only=True),
        "valid_transitions": AvailableTransitionField(style={"list_default": False}),
    }


def workflow_field_model_info(fields):
    """Fill in the database and model types of the workflow state fields in ``model_fields`` metadata.

    ``workflow_state_code`` and ``workflow_state_name`` source through
    ``WorkflowModelMethods.workflow_state``, a property with no model field of its own, so
    ``resolve_serializer_field_model_field`` can never describe their ``type_db`` or ``type_model``.
    ``State.code`` and ``State.name`` are always real ``CharField`` columns.
    """
    for field_name in WORKFLOW_STATE_FIELDS:
        if field_name in fields:
            fields[field_name]["type_db"] = "CharField"
            fields[field_name]["type_model"] = "CharField"
    return fields


class StateSerializer(VuedaExpandableFieldsSerializerMixin, FlexFieldsSerializerMixin, drf_serializers.ModelSerializer):
    class Meta:
        fields = ["code", "name"]
        model = State


class TransitionSerializer(
    VuedaExpandableFieldsSerializerMixin, FlexFieldsSerializerMixin, drf_serializers.ModelSerializer
):
    class Meta:
        fields = ["code", "name"]
        model = Transition


class WorkflowSerializer(
    VuedaExpandableFieldsSerializerMixin, FlexFieldsSerializerMixin, drf_serializers.ModelSerializer
):
    app_label = drf_serializers.CharField(read_only=True, source="content_type.app_label")
    model = drf_serializers.CharField(read_only=True, source="content_type.model")

    class Meta:
        fields = ["code", "name", "app_label", "model"]
        model = Workflow
        expandable_fields = {
            "states": ("vueda.workflow.serializers.StateSerializer", {"many": True, "read_only": True}),
            "transitions": ("vueda.workflow.serializers.TransitionSerializer", {"many": True, "read_only": True}),
        }

    def get_schema_operation_parameters(self, operation_id, parameters=()):  # pragma: no cover
        parameters = super().get_schema_operation_parameters(operation_id, parameters)

        match operation_id:
            case "vueda.workflow_workflows_list":
                for index, existing_parameter in reversed(tuple(enumerate(parameters))):
                    if existing_parameter["name"] in ("app_label", "model", settings.REST_FLEX_FIELDS2["EXPAND_PARAM"]):
                        parameters.pop(index)

            case (
                "vueda.workflow_workflows_object_transitions"
                | "vueda.workflow_workflows_object_state"
                | "vueda.workflow_workflows_execute_transition"
            ):
                for index, existing_parameter in reversed(tuple(enumerate(parameters))):
                    if existing_parameter["name"] in (settings.REST_FLEX_FIELDS2["EXPAND_PARAM"],):
                        parameters.pop(index)

        return parameters
