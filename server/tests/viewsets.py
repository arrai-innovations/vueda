from tests.filtersets import ProductFilterSet
from tests.models import Product
from tests.models import Timesheet
from tests.models import TimesheetEntry
from tests.serializers import ProductSerializer
from tests.serializers import TimesheetEntrySerializer
from tests.serializers import TimesheetSerializer
from vueda.core.viewsets import VuedaHistoryViewSet


class TimesheetViewSet(VuedaHistoryViewSet):
    queryset = Timesheet.objects.all()
    serializer_class = TimesheetSerializer
    permit_list_expands = ["employee", "supervisor"]


class ProductViewSet(VuedaHistoryViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filterset_class = ProductFilterSet


class TimesheetEntryViewSet(VuedaHistoryViewSet):
    queryset = TimesheetEntry.objects.all()
    serializer_class = TimesheetEntrySerializer
    column_totals = ["hours"]
