from tests.erring.models import workflow_mixins as my_models
from tests.erring.serializers import workflow_mixins as my_serializers
from vueda.core.viewsets import VuedaViewSet


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


class MoSoVoWoViewSet(VuedaViewSet):
    queryset = my_models.MoSoVoWo.objects.all()
    serializer_class = my_serializers.MoSoVoWoSerializer


class MxSoVoWoViewSet(VuedaViewSet):
    queryset = my_models.MxSoVoWo.objects.all()
    serializer_class = my_serializers.MxSoVoWoSerializer


class MoSxVoWoViewSet(VuedaViewSet):
    queryset = my_models.MoSxVoWo.objects.all()
    serializer_class = my_serializers.MoSxVoWoSerializer


class MxSxVoWoViewSet(VuedaViewSet):
    queryset = my_models.MxSxVoWo.objects.all()
    serializer_class = my_serializers.MxSxVoWoSerializer


class MoSoVxWoViewSet(VuedaViewSet):
    queryset = my_models.MoSoVxWo.objects.all()
    serializer_class = my_serializers.MoSoVxWoSerializer


class MxSoVxWoViewSet(VuedaViewSet):
    queryset = my_models.MxSoVxWo.objects.all()
    serializer_class = my_serializers.MxSoVxWoSerializer


class MoSxVxWoViewSet(VuedaViewSet):
    queryset = my_models.MoSxVxWo.objects.all()
    serializer_class = my_serializers.MoSxVxWoSerializer


class MxSxVxWoViewSet(VuedaViewSet):
    queryset = my_models.MxSxVxWo.objects.all()
    serializer_class = my_serializers.MxSxVxWoSerializer


class MoSoVoWxViewSet(VuedaViewSet):
    queryset = my_models.MoSoVoWx.objects.all()
    serializer_class = my_serializers.MoSoVoWxSerializer


class MxSoVoWxViewSet(VuedaViewSet):
    queryset = my_models.MxSoVoWx.objects.all()
    serializer_class = my_serializers.MxSoVoWxSerializer


class MoSxVoWxViewSet(VuedaViewSet):
    queryset = my_models.MoSxVoWx.objects.all()
    serializer_class = my_serializers.MoSxVoWxSerializer


class MxSxVoWxViewSet(VuedaViewSet):
    queryset = my_models.MxSxVoWx.objects.all()
    serializer_class = my_serializers.MxSxVoWxSerializer


class MoSoVxWxViewSet(VuedaViewSet):
    queryset = my_models.MoSoVxWx.objects.all()
    serializer_class = my_serializers.MoSoVxWxSerializer


class MxSoVxWxViewSet(VuedaViewSet):
    queryset = my_models.MxSoVxWx.objects.all()
    serializer_class = my_serializers.MxSoVxWxSerializer


class MoSxVxWxViewSet(VuedaViewSet):
    queryset = my_models.MoSxVxWx.objects.all()
    serializer_class = my_serializers.MoSxVxWxSerializer


class MxSxVxWxViewSet(VuedaViewSet):
    queryset = my_models.MxSxVxWx.objects.all()
    serializer_class = my_serializers.MxSxVxWxSerializer
