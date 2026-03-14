"""URL configuration for the vueda.user app."""

__all__ = (
    "urlpatterns",
    "user_patterns",
)

from allauth.headless.urls import urlpatterns as allauth_urlpatterns
from dj_rest_auth.views import LogoutView
from dj_rest_auth.views import PasswordChangeView
from django.conf import settings
from django.urls import include
from django.urls import path

from vueda.user import views
from vueda.user.views import AllAuthLoginView
from vueda.user.views import AllAuthReauthenticateView
from vueda.user.views import AllAuthTwoFactorAuthView
from vueda.user.views import WhoIsView
from vueda.user.views import totp_code


user_patterns = [
    path("who-is/", WhoIsView.as_view(), name="who-is"),
    path("_allauth/", include(allauth_urlpatterns)),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("login/", AllAuthLoginView.as_api_view(client="browser"), name="login2"),
    path("2fa/authenticate/", AllAuthTwoFactorAuthView.as_api_view(client="browser"), name="authenticate"),
    path("reauthenticate/", AllAuthReauthenticateView.as_api_view(client="browser"), name="reauthenticate"),
    path("", include("vueda.user.routers")),
    path("totp_code/", totp_code, name="totp_code"),
    path("change_password/", PasswordChangeView.as_view(), name="change_password"),
]

urlpatterns = [
    path("vueda.user/", include(user_patterns)),
]

if settings.DEBUG:
    from django.contrib.auth import views as django_views

    urlpatterns += [
        path("vueda.user/dev-login/", django_views.LoginView.as_view(), name="dev-login"),
        path("vueda.user/dev-logout/", django_views.LogoutView.as_view(), name="dev-logout"),
        path("vueda.user/permissions/overview/", views.PermissionOverviewView.as_view(), name="permission-overview"),
        path("vueda.user/permissions/save/", views.PermissionSaveView.as_view(), name="permission-save"),
        path(
            "vueda.user/permissions/delete/<int:permission_id>/<int:group_id>/",
            views.PermissionDeleteView.as_view(),
            name="permission-delete",
        ),
    ]
