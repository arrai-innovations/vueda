from django.urls import include
from django.urls import path

from tests.erring.viewsets import ExpandableFieldsUnresolvableStringViewSet
from vueda.core.routers import IncludeAppInRouteNameRouter


router = IncludeAppInRouteNameRouter()
router.register("expandable_fields_unresolvable_string", ExpandableFieldsUnresolvableStringViewSet)

urlpatterns = [
    path("erring/", include(router.urls)),
]
