from tests.erring import models as my_models
from vueda.core.serializers import VuedaSerializer


# Base Classes
class HasWorkflow(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        fields = [
            "id",
            "name",
        ] + VuedaSerializer.Meta.fields


class NoWorkflow(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        fields = [
            "id",
            "name",
        ] + VuedaSerializer.Meta.fields


# The following are used for these class names, so the names don't get to long:

# Mo - Model inherits HasWorkflowSerializerMixin
# Mx - Model doesn't inherit HasWorkflowSerializerMixin

# So - Serializer inherits HasWorkflowSerializerMixin
# Sx - Serializer doesn't inherit HasWorkflowSerializerMixin

# Vo - Viewset inherits HasWorkflowViewMixin
# Vx - Viewset doesn't inherit HasWorkflowViewMixin
# Vz - No Viewset

# Wo - Has Workflow
# Wx - No Workflow


class MoSoVoWoSerializer(HasWorkflow):
    class Meta(HasWorkflow.Meta):
        model = my_models.MoSoVoWo


class MxSoVoWoSerializer(HasWorkflow):
    class Meta(NoWorkflow.Meta):
        model = my_models.MxSoVoWo


class MoSxVoWoSerializer(NoWorkflow):
    class Meta(HasWorkflow.Meta):
        model = my_models.MoSxVoWo


class MxSxVoWoSerializer(NoWorkflow):
    class Meta(NoWorkflow.Meta):
        model = my_models.MxSxVoWo


class MoSoVxWoSerializer(HasWorkflow):
    class Meta(HasWorkflow.Meta):
        model = my_models.MoSoVxWo


class MxSoVxWoSerializer(HasWorkflow):
    class Meta(NoWorkflow.Meta):
        model = my_models.MxSoVxWo


class MoSxVxWoSerializer(NoWorkflow):
    class Meta(HasWorkflow.Meta):
        model = my_models.MoSxVxWo


class MxSxVxWoSerializer(NoWorkflow):
    class Meta(NoWorkflow.Meta):
        model = my_models.MxSxVxWo


class MoSoVzWoSerializer(HasWorkflow):
    class Meta(HasWorkflow.Meta):
        model = my_models.MoSoVzWo


class MxSoVzWoSerializer(HasWorkflow):
    class Meta(NoWorkflow.Meta):
        model = my_models.MxSoVzWo


class MoSxVzWoSerializer(NoWorkflow):
    class Meta(HasWorkflow.Meta):
        model = my_models.MoSxVzWo


class MxSxVzWoSerializer(NoWorkflow):
    class Meta(NoWorkflow.Meta):
        model = my_models.MxSxVzWo


class MoSoVoWxSerializer(HasWorkflow):
    class Meta(HasWorkflow.Meta):
        model = my_models.MoSoVoWx


class MxSoVoWxSerializer(HasWorkflow):
    class Meta(NoWorkflow.Meta):
        model = my_models.MxSoVoWx


class MoSxVoWxSerializer(NoWorkflow):
    class Meta(HasWorkflow.Meta):
        model = my_models.MoSxVoWx


class MxSxVoWxSerializer(NoWorkflow):
    class Meta(NoWorkflow.Meta):
        model = my_models.MxSxVoWx


class MoSoVxWxSerializer(HasWorkflow):
    class Meta(HasWorkflow.Meta):
        model = my_models.MoSoVxWx


class MxSoVxWxSerializer(HasWorkflow):
    class Meta(NoWorkflow.Meta):
        model = my_models.MxSoVxWx


class MoSxVxWxSerializer(NoWorkflow):
    class Meta(HasWorkflow.Meta):
        model = my_models.MoSxVxWx


class MxSxVxWxSerializer(NoWorkflow):
    class Meta(NoWorkflow.Meta):
        model = my_models.MxSxVxWx


class MoSoVzWxSerializer(HasWorkflow):
    class Meta(VuedaSerializer.Meta):
        model = my_models.MoSoVzWx


class MxSoVzWxSerializer(HasWorkflow):
    class Meta(NoWorkflow.Meta):
        model = my_models.MxSoVzWx


class MoSxVzWxSerializer(NoWorkflow):
    class Meta(HasWorkflow.Meta):
        model = my_models.MoSxVzWx


class MxSxVzWxSerializer(NoWorkflow):
    class Meta(NoWorkflow.Meta):
        model = my_models.MxSxVzWx
