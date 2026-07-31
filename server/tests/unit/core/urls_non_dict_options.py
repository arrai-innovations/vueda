from django.urls import include
from django.urls import path

from tests.erring.viewsets import ExpandableFieldsNonDictOptionsViewSet
from vueda.core.routers import IncludeAppInRouteNameRouter


router = IncludeAppInRouteNameRouter()
router.register("expandable_fields_non_dict_options", ExpandableFieldsNonDictOptionsViewSet)

urlpatterns = [
    path("erring/", include(router.urls)),
]
