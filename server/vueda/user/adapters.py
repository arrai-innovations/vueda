from allauth.account.adapter import DefaultAccountAdapter
from allauth.headless.adapter import DefaultHeadlessAdapter
from allauth.mfa.adapter import DefaultMFAAdapter
from django.contrib.auth import get_user_model
from django.db import models
from rest_framework.settings import api_settings

from vueda.core.exceptions import VuedaValidationError


class VuedaAllAuthHeadlessAdapter(DefaultHeadlessAdapter):
    """
    Adapter for Vueda AllAuth integration.
    """

    def user_as_dataclass(self, user):
        UserDc = self.get_user_dataclass()  # noqa: N806
        kwargs = {}
        User = get_user_model()  # noqa: N806
        pk_field_class = type(User._meta.pk)
        if not user.pk:
            id_dc = None
        elif issubclass(pk_field_class, models.IntegerField):
            id_dc = user.pk
        else:
            id_dc = str(user.pk)

        kwargs.update(
            {
                "id": id_dc,
                "email": user.email,
                "display": user.name,
                "has_usable_password": user.has_usable_password(),
            }
        )
        return UserDc(**kwargs)


class VuedaAllAuthAccountAdapter(DefaultAccountAdapter):
    def validation_error(self, code, *args):
        message = self.error_messages[code]
        if args:
            message = message % args
        raise VuedaValidationError({api_settings.NON_FIELD_ERRORS_KEY: [message]})


class VuedaAllAuthMFAAdapter(DefaultMFAAdapter):
    def validation_error(self, code, *args):
        message = self.error_messages[code]
        if args:
            message = message % args
        raise VuedaValidationError({api_settings.NON_FIELD_ERRORS_KEY: [message]})
