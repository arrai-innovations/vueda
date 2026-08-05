from django.urls import include
from django.urls import path

from tests.product.viewsets import ProductOrderingPropertyFieldViewSet
from vueda.core.routers import VuedaRouter


product_router = VuedaRouter()
product_router.register("products", ProductOrderingPropertyFieldViewSet)

urlpatterns = [
    path(
        "routes/",
        include(
            [
                path("tests/product/", include(product_router.urls)),
                path("", include("vueda.info.urls")),
            ]
        ),
    )
]

handler500 = "rest_framework.exceptions.server_error"
handler400 = "rest_framework.exceptions.bad_request"
handler404 = "vueda.core.exceptions.page_not_found"
