from rest_framework import viewsets

from tests.models import Timesheet
from tests.serializers import TimesheetSerializer
from vueda.core.permissions import ObjectPermissions
from vueda.core.viewsets import NoExtraFieldsForViewSetMixin


class TimesheetViewSet(NoExtraFieldsForViewSetMixin, viewsets.ModelViewSet):
    queryset = Timesheet.objects.all()
    serializer_class = TimesheetSerializer
    permission_classes = [ObjectPermissions]
