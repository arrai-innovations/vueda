from django.contrib.auth import views
from django.urls import path

from vueda.user.views import WhoIsView


urlpatterns = [
    path("who-is/", WhoIsView.as_view(), name="who-is"),
    path("login/", views.LoginView.as_view(), name="login"),
]
