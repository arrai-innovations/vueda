from django.urls import include
from django.urls import path

from tests.erring.viewsets import ExpandableFieldsListViewSet
from vueda.core.routers import IncludeAppInRouteNameRouter


router = IncludeAppInRouteNameRouter()
router.register("expandable_fields_list", ExpandableFieldsListViewSet)

urlpatterns = [
    path("erring/", include(router.urls)),
]
