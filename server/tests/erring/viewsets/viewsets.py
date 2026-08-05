from rest_framework.viewsets import ModelViewSet

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
    permit_list_expands = ["no_name"]


class ExpandableFieldsListViewSet(VuedaViewSet):
    queryset = my_models.NoExpandableFieldsData.objects.all()
    serializer_class = my_serializers.ExpandableFieldsListSerializer


class ExpandableFieldsBadTupleLengthViewSet(VuedaViewSet):
    queryset = my_models.NoExpandableFieldsData.objects.all()
    serializer_class = my_serializers.ExpandableFieldsBadTupleLengthSerializer


class ExpandableFieldsUnresolvableStringViewSet(VuedaViewSet):
    queryset = my_models.NoExpandableFieldsData.objects.all()
    serializer_class = my_serializers.ExpandableFieldsUnresolvableStringSerializer


class ExpandableFieldsNotClassViewSet(VuedaViewSet):
    queryset = my_models.NoExpandableFieldsData.objects.all()
    serializer_class = my_serializers.ExpandableFieldsNotClassSerializer


class ExpandableFieldsNonDictOptionsViewSet(VuedaViewSet):
    queryset = my_models.NoExpandableFieldsData.objects.all()
    serializer_class = my_serializers.ExpandableFieldsNonDictOptionsSerializer


class ExpandableFieldsNotFieldSubclassViewSet(VuedaViewSet):
    queryset = my_models.NoExpandableFieldsData.objects.all()
    serializer_class = my_serializers.ExpandableFieldsNotFieldSubclassSerializer


class ExpandableFieldsValidStringViewSet(VuedaViewSet):
    queryset = my_models.NoExpandableFieldsData.objects.all()
    serializer_class = my_serializers.ExpandableFieldsValidStringSerializer


class ExpandableFieldsPointsAtUnregisteredViewSet(VuedaViewSet):
    queryset = my_models.RelatedObjectsAreMissingData.objects.all()
    serializer_class = my_serializers.ExpandableFieldsPointsAtUnregisteredSerializer


class ExpandableFieldsNestedInvalidViewSet(VuedaViewSet):
    queryset = my_models.RelatedObjectsAreMissingData.objects.all()
    serializer_class = my_serializers.ExpandableFieldsNestedInvalidSerializer


class UnregisteredNonVuedaExpandableFieldsNonDictOptionsViewSet(ModelViewSet):
    """A plain (non-VuedaViewSet) ModelViewSet, proving the check isn't VUEDA-specific."""

    queryset = my_models.NoExpandableFieldsData.objects.all()
    serializer_class = my_serializers.UnregisteredNonVuedaExpandableFieldsNonDictOptionsSerializer
