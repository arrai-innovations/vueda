from django.urls import include
from django.urls import path

from tests.store.viewsets import CartItemColumnTotalsViewSet
from vueda.core.routers import VuedaRouter


cart_item_router = VuedaRouter()
cart_item_router.register("cart_items", CartItemColumnTotalsViewSet)

urlpatterns = [
    path(
        "routes/",
        include(
            [
                path("tests/store/", include(cart_item_router.urls)),
                path("", include("vueda.info.urls")),
            ]
        ),
    )
]

handler500 = "rest_framework.exceptions.server_error"
handler400 = "rest_framework.exceptions.bad_request"
handler404 = "vueda.core.exceptions.page_not_found"
