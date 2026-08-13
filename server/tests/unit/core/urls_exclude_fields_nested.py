from django.urls import include
from django.urls import path

from tests.erring.viewsets import ExcludeFieldsAsNestedFieldViewSet
from vueda.core.routers import IncludeAppInRouteNameRouter


router = IncludeAppInRouteNameRouter()
router.register("exclude_fields_as_nested_field", ExcludeFieldsAsNestedFieldViewSet)

urlpatterns = [
    path("erring/", include(router.urls)),
]
