from django.urls import include
from django.urls import path

from vueda.info.views import server_info_view


urlpatterns = [
    path("", include("vueda.info.routers")),
    path("server_info/", server_info_view),
]
