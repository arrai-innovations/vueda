from django.urls import include
from django.urls import path

from tests.store.viewsets import ProductM2MSearchViewSet
from vueda.core.routers import VuedaRouter


store_router = VuedaRouter()
store_router.register("products", ProductM2MSearchViewSet)

urlpatterns = [
    path(
        "routes/",
        include(
            [
                path("tests/store/", include(store_router.urls)),
                path("", include("vueda.info.urls")),
                path("", include("vueda.user.urls")),
                path("", include("vueda.workflow.urls")),
                path("", include("vueda.release.urls")),
                path("", include("vueda.vdq.urls")),
            ]
        ),
    )
]

handler500 = "rest_framework.exceptions.server_error"
handler400 = "rest_framework.exceptions.bad_request"
handler404 = "vueda.core.exceptions.page_not_found"
