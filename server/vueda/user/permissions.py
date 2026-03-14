"""DRF permission class for users mid-MFA login stage."""

__all__ = ("Authenticating",)

from allauth.account.stages import LoginStageController
from allauth.mfa.internal.constants import LoginStageKey
from rest_framework.permissions import BasePermission


class Authenticating(BasePermission):
    def has_permission(self, request, view):
        stage = LoginStageController.enter(request, LoginStageKey.MFA_AUTHENTICATE.value)
        return stage is not None
