from dj_rest_auth.views import LoginView
from dj_rest_auth.views import LogoutView
from django.conf import settings
from django.urls import path

from vueda.user import views
from vueda.user.views import WhoIsView


urlpatterns = [
    path("who-is/", WhoIsView.as_view(), name="who-is"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
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
