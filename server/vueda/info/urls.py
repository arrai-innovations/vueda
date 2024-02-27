from django.urls import include
from django.urls import path

from vueda.info.routers import info_router


urlpatterns = [
    path("", include(info_router.urls)),
]
