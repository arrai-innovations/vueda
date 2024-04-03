from django.conf import settings
from django.contrib.auth import views
from django.urls import path

from vueda.user.views import WhoIsView


urlpatterns = [
    path("who-is/", WhoIsView.as_view(), name="who-is"),
]

if settings.DEBUG:
    urlpatterns += [
        path("login/", views.LoginView.as_view(), name="login"),
        path("logout/", views.LogoutView.as_view(), name="logout"),
    ]
