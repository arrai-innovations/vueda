from django.urls import include
from django.urls import path

from tests.erring.viewsets import ExpandableFieldsNestedInvalidViewSet
from vueda.core.routers import IncludeAppInRouteNameRouter


router = IncludeAppInRouteNameRouter()
router.register("expandable_fields_nested_invalid", ExpandableFieldsNestedInvalidViewSet)

urlpatterns = [
    path("erring/", include(router.urls)),
]
