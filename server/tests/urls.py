from django.urls import include
from django.urls import path


urlpatterns = [
    path("", include("tests.routers")),
    path("store/", include("tests.store.routers")),
    path("confirmation/", include("tests.confirmation.routers")),
]
