from tests.erring import models as my_models
from vueda.core.serializers import VuedaSerializer


# Workflow takes part through the model's class Vueda policy alone, so these serializers only
# register each model with info. They add nothing to do with workflow.


class WorkflowConfigurationSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        fields = [
            "id",
            "name",
        ] + VuedaSerializer.Meta.fields


class EnabledWithWorkflowSerializer(WorkflowConfigurationSerializer):
    class Meta(WorkflowConfigurationSerializer.Meta):
        model = my_models.EnabledWithWorkflow


class EnabledWithoutWorkflowSerializer(WorkflowConfigurationSerializer):
    class Meta(WorkflowConfigurationSerializer.Meta):
        model = my_models.EnabledWithoutWorkflow


class NotEnabledWithWorkflowSerializer(WorkflowConfigurationSerializer):
    class Meta(WorkflowConfigurationSerializer.Meta):
        model = my_models.NotEnabledWithWorkflow


class NotEnabledWithoutWorkflowSerializer(WorkflowConfigurationSerializer):
    class Meta(WorkflowConfigurationSerializer.Meta):
        model = my_models.NotEnabledWithoutWorkflow
