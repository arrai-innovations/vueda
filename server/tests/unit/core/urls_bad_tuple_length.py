from django.urls import include
from django.urls import path

from tests.erring.viewsets import ExpandableFieldsBadTupleLengthViewSet
from vueda.core.routers import IncludeAppInRouteNameRouter


router = IncludeAppInRouteNameRouter()
router.register("expandable_fields_bad_tuple_length", ExpandableFieldsBadTupleLengthViewSet)

urlpatterns = [
    path("erring/", include(router.urls)),
]
