from django.urls import include
from django.urls import path

from tests.erring.viewsets import ExpandableFieldsNotFieldSubclassViewSet
from vueda.core.routers import IncludeAppInRouteNameRouter


router = IncludeAppInRouteNameRouter()
router.register("expandable_fields_not_field_subclass", ExpandableFieldsNotFieldSubclassViewSet)

urlpatterns = [
    path("erring/", include(router.urls)),
]
