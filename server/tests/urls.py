from django.urls import include
from django.urls import path

from tests.routers import tests_router


urlpatterns = [
    path("", include(tests_router.urls)),
]
