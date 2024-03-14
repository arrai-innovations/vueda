import pytest
from django.core.exceptions import ImproperlyConfigured

from vueda import info
from vueda.info import registration


@pytest.mark.django_db
class TestRegistration:
    def test_register_decorator(self):
        from tests.models import Timesheet
        from tests.serializers import TimesheetSerializer
        from vueda.core.viewsets import VuedaViewSet

        # Make the registry a new dictionary, so tests don't pollute each other.
        _registry = registration.get_empty_registry()

        @info.register(TimesheetSerializer)
        class TimesheetViewSet(VuedaViewSet):
            queryset = Timesheet.objects.all()

        assert len(_registry) == 1
        for registered_item in _registry.values():
            assert registered_item["viewset"] == TimesheetViewSet
            # A default serializer is created if one isn't defined, but it won't have the model on it.
            assert not hasattr(registered_item["serializer"], "model")

    def test_register_function(self):
        from tests.models import Product
        from tests.serializers import ProductSerializer
        from vueda.core.viewsets import VuedaViewSet

        # Make the registry a new dictionary, so tests don't pollute each other.
        _registry = registration.get_empty_registry()

        class ProductViewSet(VuedaViewSet):
            queryset = Product.objects.all()
            serializer_class = ProductSerializer

        info.register(ProductSerializer, ProductViewSet)

        assert len(_registry) == 1
        for registered_item in _registry.values():
            assert registered_item["viewset"] == ProductViewSet
            # A default serializer is created if one isn't defined, but it won't have the model on it.
            assert registered_item["serializer"] == ProductSerializer

    def test_register_improperly(self):
        from vueda.core.serializers import VuedaSerializerMixin
        from vueda.core.viewsets import VuedaViewSet

        # Make the registry a new dictionary, so tests don't pollute each other.
        registration.get_empty_registry()

        class TestSerializer(VuedaSerializerMixin):
            pass

        class TestViewSet(VuedaViewSet):
            pass

        with pytest.raises(ImproperlyConfigured):
            info.register(TestSerializer, TestViewSet)

    def test_register_duplicate(self):
        from tests.models import Product
        from tests.serializers import ProductSerializer
        from vueda.core.viewsets import VuedaViewSet

        # Make the registry a new dictionary, so tests don't pollute each other.
        registration.get_empty_registry()

        class ProductViewSet(VuedaViewSet):
            queryset = Product.objects.all()
            serializer_class = ProductSerializer

        info.register(ProductSerializer, ProductViewSet)

        with pytest.raises(ValueError) as exc_info:
            info.register(ProductSerializer, ProductViewSet)
        assert "is already registered." in str(exc_info.value)
