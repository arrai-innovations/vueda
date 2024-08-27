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
