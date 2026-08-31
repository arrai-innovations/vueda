"""Serializers for optional VUEDA app boundary tests."""

from tests.optional_apps.models import Ticket
from vueda.core.serializers import VuedaSerializer


class TicketSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = Ticket
        fields = ["id", "name"] + VuedaSerializer.Meta.fields
