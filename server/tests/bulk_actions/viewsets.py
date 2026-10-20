import tests.bulk_actions.models as my_models
import tests.bulk_actions.serializers as my_serializers
from vueda.core.viewsets import DeactivateActionViewSetMixin
from vueda.core.viewsets import VuedaViewSet


class IntegerKeyGadgetViewSet(DeactivateActionViewSetMixin, VuedaViewSet):
    queryset = my_models.IntegerKeyGadget.objects.all()
    serializer_class = my_serializers.IntegerKeyGadgetSerializer


class UUIDKeyGadgetViewSet(DeactivateActionViewSetMixin, VuedaViewSet):
    queryset = my_models.UUIDKeyGadget.objects.all()
    serializer_class = my_serializers.UUIDKeyGadgetSerializer


class StringKeyGadgetViewSet(DeactivateActionViewSetMixin, VuedaViewSet):
    queryset = my_models.StringKeyGadget.objects.all()
    serializer_class = my_serializers.StringKeyGadgetSerializer


class CompositeKeyGadgetViewSet(DeactivateActionViewSetMixin, VuedaViewSet):
    queryset = my_models.CompositeKeyGadget.objects.all()
    serializer_class = my_serializers.CompositeKeyGadgetSerializer
