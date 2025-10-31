from allauth.headless.urls import urlpatterns as allauth_urlpatterns
from dj_rest_auth.views import LogoutView
from django.conf import settings
from django.urls import include
from django.urls import path

from vueda.user import views
from vueda.user.views import AllAuthLoginView
from vueda.user.views import AllAuthReauthenticateView
from vueda.user.views import AllAuthTwoFactorAuthView
from vueda.user.views import WhoIsView
from vueda.user.views import totp_code


urlpatterns = [
    path("who-is/", WhoIsView.as_view(), name="who-is"),
    path("_allauth/", include(allauth_urlpatterns)),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("login/", AllAuthLoginView.as_api_view(client="browser"), name="login2"),
    path("2fa/authenticate/", AllAuthTwoFactorAuthView.as_api_view(client="browser"), name="authenticate"),
    path("reauthenticate/", AllAuthReauthenticateView.as_api_view(client="browser"), name="reauthenticate"),
    path("", include("vueda.user.routers")),
    path("totp_code/", totp_code, name="totp_code"),
]


if settings.DEBUG:
    from django.contrib.auth import views as django_views

    urlpatterns += [
        path("local-login/", django_views.LoginView.as_view(), name="local-login"),
        path("local-logout/", django_views.LogoutView.as_view(), name="local-logout"),
        path("permissions/overview/", views.PermissionOverviewView.as_view(), name="permission-overview"),
        path("permissions/save/", views.PermissionSaveView.as_view(), name="permission-save"),
        path(
            "permissions/delete/<int:permission_id>/<int:group_id>/",
            views.PermissionDeleteView.as_view(),
            name="permission-delete",
        ),
    ]
