from rest_framework import serializers

from vueda.user.models import TWO_FACTOR_AUTHENTICATION_OPTIONS
from vueda.user.utils import is_twilio_configured


class TOTPMethodChoiceField(serializers.ChoiceField):
    def __init__(self, **kwargs):
        choices = self._get_available_choices()
        super().__init__(choices=choices, **kwargs)

    def _get_available_choices(self):
        if is_twilio_configured():
            return TWO_FACTOR_AUTHENTICATION_OPTIONS
        else:
            return [choice for choice in TWO_FACTOR_AUTHENTICATION_OPTIONS if choice[0] != "sms"]
