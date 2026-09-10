from django.urls import include
from django.urls import path

from tests.erring.viewsets import ExpandableFieldsEmptyTupleViewSet
from vueda.core.routers import IncludeAppInRouteNameRouter


router = IncludeAppInRouteNameRouter()
router.register("expandable_fields_empty_tuple", ExpandableFieldsEmptyTupleViewSet)

urlpatterns = [
    path("erring/", include(router.urls)),
]
