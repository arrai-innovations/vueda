from django.urls import include
from django.urls import path

from tests.routers import tests_router
from tests.store.routers import store_tests_router
from vueda.user.urls import urlpatterns as user_urlpatterns


urlpatterns = [
    path("", include(tests_router.urls)),
    path("store/", include(store_tests_router.urls)),
] + user_urlpatterns
