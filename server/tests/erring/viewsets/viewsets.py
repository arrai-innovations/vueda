import tests.erring.filtersets as my_filtersets
import tests.erring.models as my_models
import tests.erring.serializers as my_serializers
from vueda.core.viewsets import VuedaViewSet


class NoExpandableFieldsDataViewSet(VuedaViewSet):
    queryset = my_models.NoExpandableFieldsData.objects.all()
    serializer_class = my_serializers.NoExpandableFieldsDataSerializer


class RelatedObjectsAreMissingDataViewSet(VuedaViewSet):
    queryset = my_models.RelatedObjectsAreMissingData.objects.all()
    serializer_class = my_serializers.RelatedObjectsAreMissingDataSerializer
    filterset_class = my_filtersets.RelatedObjectsAreMissingDataFilterSet
