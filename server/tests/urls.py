from django.urls import include
from django.urls import path

from tests.erring.routers import erring_router
from tests.routers import tests_router
from tests.store.routers import store_tests_router


urlpatterns = [
    path("", include(tests_router.urls)),
    path("erring/", include(erring_router.urls)),
    path("store/", include(store_tests_router.urls)),
]
