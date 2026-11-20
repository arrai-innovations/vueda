import tests.bulk_actions.models as my_models
import tests.bulk_actions.serializers as my_serializers
from vueda.core.filters import VuedaFilterSet
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


class LookupKeyGadgetFilterSet(VuedaFilterSet):
    class Meta:
        model = my_models.LookupKeyGadget
        fields = ["name"]


class LookupKeyGadgetViewSet(DeactivateActionViewSetMixin, VuedaViewSet):
    queryset = my_models.LookupKeyGadget.objects.all()
    serializer_class = my_serializers.LookupKeyGadgetSerializer
    lookup_field = "sage_id"
    filterset_class = LookupKeyGadgetFilterSet


class RenamedKwargLookupKeyGadgetViewSet(LookupKeyGadgetViewSet):
    """Names the ``sage_id`` URL keyword ``gadget_key``, so the URL keyword and the lookup field differ."""

    lookup_url_kwarg = "gadget_key"
