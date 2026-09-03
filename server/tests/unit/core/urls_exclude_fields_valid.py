from django.urls import include
from django.urls import path

from tests.erring.viewsets import ExcludeFieldsViewSet
from vueda.core.routers import IncludeAppInRouteNameRouter


router = IncludeAppInRouteNameRouter()
router.register("exclude_fields_valid", ExcludeFieldsViewSet)

urlpatterns = [
    path("erring/", include(router.urls)),
]
