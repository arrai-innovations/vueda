from rest_flex_fields.serializers import FlexFieldsSerializerMixin
from rest_framework import serializers as drf_serializers

from vueda.core.serializers import VuedaExpandableFieldsSerializerMixin
from vueda.workflow.models import State
from vueda.workflow.models import Transition
from vueda.workflow.models import Workflow


class HasWorkflowSerializerMixin(metaclass=drf_serializers.SerializerMetaclass):
    workflow_state_code = drf_serializers.CharField(source="workflow_state.code", read_only=True)
    workflow_state_name = drf_serializers.CharField(source="workflow_state.name", read_only=True)

    class Meta:
        fields = ["workflow_state_code", "workflow_state_name"]


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

    def get_schema_operation_parameters(self, operation_id, parameters=()):
        parameters = super().get_schema_operation_parameters(operation_id, parameters)

        match operation_id:
            case "vueda.workflow_workflows_list":
                for index, existing_parameter in reversed(tuple(enumerate(parameters))):
                    if existing_parameter["name"] in ("app_label", "model"):
                        parameters.pop(index)

            case "vueda.workflow_workflows_retrieve":
                for existing_parameter in parameters:
                    match existing_parameter["name"]:
                        case "app_label":
                            existing_parameter.update(
                                {
                                    "description": "The name of the application the model is part of.",
                                    "example": "store",
                                    # 'schema': {'pattern': '^[a-zA-Z0-9_]+$'},
                                }
                            )

                        case "model":
                            existing_parameter.update(
                                {
                                    "description": "The name of the model class.",
                                    "example": "product",
                                }
                            )

        return parameters
