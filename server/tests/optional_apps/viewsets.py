"""ViewSets for optional VUEDA app boundary tests."""

from rest_framework.permissions import AllowAny

from tests.optional_apps.models import Ticket
from tests.optional_apps.serializers import TicketSerializer
from vueda.core.viewsets import VuedaViewSet


class TicketViewSet(VuedaViewSet):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [AllowAny]
