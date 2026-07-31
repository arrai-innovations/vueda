from django.urls import include
from django.urls import path

from tests.erring.viewsets import UnregisteredNonVuedaExpandableFieldsNonDictOptionsViewSet
from vueda.core.routers import IncludeAppInRouteNameRouter


router = IncludeAppInRouteNameRouter()
router.register(
    "unregistered_non_vueda_expandable_fields_non_dict_options",
    UnregisteredNonVuedaExpandableFieldsNonDictOptionsViewSet,
)

urlpatterns = [
    path("erring/", include(router.urls)),
]
