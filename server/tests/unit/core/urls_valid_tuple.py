from django.urls import include
from django.urls import path

from tests.erring.viewsets import RelatedObjectsAreMissingDataViewSet
from vueda.core.routers import IncludeAppInRouteNameRouter


router = IncludeAppInRouteNameRouter()
router.register("related_objects_are_missing_data", RelatedObjectsAreMissingDataViewSet)

urlpatterns = [
    path("erring/", include(router.urls)),
]
