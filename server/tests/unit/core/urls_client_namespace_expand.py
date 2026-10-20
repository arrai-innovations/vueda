from django.urls import include
from django.urls import path

from tests.erring.viewsets import ExpandableFieldsClientNamespaceViewSet
from vueda.core.routers import IncludeAppInRouteNameRouter


router = IncludeAppInRouteNameRouter()
router.register("expandable_fields_client_namespace", ExpandableFieldsClientNamespaceViewSet)

urlpatterns = [
    path("erring/", include(router.urls)),
]
