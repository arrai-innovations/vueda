"""Serves `CartEmptyFilterSetViewSet` at `store.cart-list`, for the list validation tests."""

from django.urls import include
from django.urls import path

from tests.store.viewsets import CartEmptyFilterSetViewSet
from vueda.core.routers import IncludeAppInRouteNameRouter


router = IncludeAppInRouteNameRouter()
router.register("carts", CartEmptyFilterSetViewSet)

urlpatterns = [
    path("routes/tests/store/", include(router.urls)),
]

handler500 = "rest_framework.exceptions.server_error"
handler400 = "rest_framework.exceptions.bad_request"
handler404 = "vueda.core.exceptions.page_not_found"
