from dj_rest_auth.views import LoginView
from dj_rest_auth.views import LogoutView
from django.urls import path

from vueda.user.views import WhoIsView


urlpatterns = [
    path("who-is/", WhoIsView.as_view(), name="who-is"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
]
