from rest_framework import serializers as drf_serializers


class HasWorkflowSerializerMixin(metaclass=drf_serializers.SerializerMetaclass):
    workflow_state_code = drf_serializers.CharField(source="workflow_state.code", read_only=True)
    workflow_state_name = drf_serializers.CharField(source="workflow_state.name", read_only=True)

    class Meta:
        fields = ["workflow_state_code", "workflow_state_name"]
