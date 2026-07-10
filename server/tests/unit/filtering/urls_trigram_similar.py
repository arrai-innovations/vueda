from django.urls import include
from django.urls import path

from tests.store.viewsets import DistributorTrigramSimilarViewSet
from vueda.core.routers import VuedaRouter


store_router = VuedaRouter()
store_router.register("distributors", DistributorTrigramSimilarViewSet)

urlpatterns = [
    path(
        "routes/",
        include(
            [
                path("tests/store/", include(store_router.urls)),
                path("", include("vueda.info.urls")),
            ]
        ),
    )
]

handler500 = "rest_framework.exceptions.server_error"
handler400 = "rest_framework.exceptions.bad_request"
handler404 = "vueda.core.exceptions.page_not_found"
