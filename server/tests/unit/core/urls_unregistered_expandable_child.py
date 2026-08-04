from django.urls import include
from django.urls import path

from tests.erring.viewsets import ExpandableFieldsPointsAtUnregisteredViewSet
from vueda.core.routers import IncludeAppInRouteNameRouter


router = IncludeAppInRouteNameRouter()
router.register("expandable_fields_points_at_unregistered", ExpandableFieldsPointsAtUnregisteredViewSet)

urlpatterns = [
    path("erring/", include(router.urls)),
]
