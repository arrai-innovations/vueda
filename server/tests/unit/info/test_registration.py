import pytest
from django.core.exceptions import ImproperlyConfigured

from tests.models import Timesheet
from vueda import info
from vueda.info import registration


@pytest.mark.django_db
class TestRegistration:
    def test_register_decorator(self):
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
        from vueda.core.serializers import VuedaHistorySerializer
        from vueda.core.viewsets import VuedaHistoryViewSet

        # Make the registry a new dictionary, so tests don't pollute each other.
        registration.get_empty_registry()

        class TestSerializer(VuedaHistorySerializer):
            pass

        class TestViewSet(VuedaHistoryViewSet):
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

    def test_register_serializer_decorator(self):
        from tests.models import Product
        from vueda.core.serializers import VuedaHistorySerializer

        # Make the registry a new dictionary, so tests don't pollute each other.
        _registry = registration.get_empty_registry()

        @info.register_serializer
        class TestSerializer(VuedaHistorySerializer):
            class Meta:
                model = Product

        assert len(_registry) == 1
        for registered_item in _registry.values():
            assert registered_item["serializer"] == TestSerializer
            assert registered_item["viewset"] is None

    def test_register_serializer_function(self):
        from tests.serializers import ProductSerializer

        # Make the registry a new dictionary, so tests don't pollute each other.
        _registry = registration.get_empty_registry()

        info.register_serializer(ProductSerializer)

        assert len(_registry) == 1
        for registered_item in _registry.values():
            assert registered_item["serializer"] == ProductSerializer
            assert registered_item["viewset"] is None

    def test_register_serializer_improperly(self):
        from vueda.core.serializers import VuedaHistorySerializer

        # Make the registry a new dictionary, so tests don't pollute each other.
        registration.get_empty_registry()

        class TestSerializer(VuedaHistorySerializer):
            pass

        with pytest.raises(ImproperlyConfigured):
            info.register_serializer(TestSerializer)

    def test_register_serializer_duplicate(self):
        from tests.serializers import ProductSerializer

        # Make the registry a new dictionary, so tests don't pollute each other.
        registration.get_empty_registry()

        info.register_serializer(ProductSerializer)

        with pytest.raises(ValueError) as exc_info:
            info.register_serializer(ProductSerializer)
        assert "is already registered." in str(exc_info.value)

    def test_register_after_register_serializer(self):
        from tests.models import Product
        from tests.serializers import ProductSerializer
        from vueda.core.viewsets import VuedaViewSet

        # Make the registry a new dictionary, so tests don't pollute each other.
        _registry = registration.get_empty_registry()

        class ProductViewSet(VuedaViewSet):
            queryset = Product.objects.all()
            serializer_class = ProductSerializer

        info.register_serializer(ProductSerializer)
        with pytest.raises(ValueError) as exc_info:
            info.register(ProductSerializer, ProductViewSet)
        assert "is already registered." in str(exc_info.value)

    def test_register_serializer_after_register(self):
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
            info.register_serializer(ProductSerializer)
        assert "is already registered." in str(exc_info.value)
