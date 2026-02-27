"""Django-filter FilterSets for TOTP device filtering."""

__all__ = ("TOTPDeviceFilterSet",)

from vueda.core.filters import VuedaFilterSet
from vueda.user.models import TOTPDevice


class TOTPDeviceFilterSet(VuedaFilterSet):
    class Meta:
        model = TOTPDevice
        fields = [
            "id",
        ]
