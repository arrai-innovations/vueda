from vueda.core.filters import VuedaFilterSet
from vueda.user.models import TOTPDevice


class TOTPDeviceFilterSet(VuedaFilterSet):
    class Meta:
        model = TOTPDevice
        fields = [
            "id",
        ]
