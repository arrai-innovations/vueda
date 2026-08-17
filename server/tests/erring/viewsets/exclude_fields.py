import tests.erring.models as my_models
import tests.erring.serializers as my_serializers
from vueda.core.viewsets import VuedaViewSet


class ExcludeFieldsViewSet(VuedaViewSet):
    """The only valid way to use ExcludeFieldsSerializerMixin: as a routed ViewSet's serializer_class."""

    queryset = my_models.NoExpandableFieldsData.objects.all()
    serializer_class = my_serializers.ExcludeFieldsSerializer


class ExcludeFieldsAsNestedFieldViewSet(VuedaViewSet):
    queryset = my_models.RelatedObjectsAreMissingData.objects.all()
    serializer_class = my_serializers.ExcludeFieldsAsNestedFieldSerializer


class ExcludeFieldsAsExpandableFieldViewSet(VuedaViewSet):
    queryset = my_models.RelatedObjectsAreMissingData.objects.all()
    serializer_class = my_serializers.ExcludeFieldsAsExpandableFieldSerializer
