from tests.filtersets import ProductFilterSet
from tests.models import Product
from tests.models import Timesheet
from tests.serializers import ProductSerializer
from tests.serializers import TimesheetSerializer
from vueda.core.permissions import ObjectPermissions
from vueda.core.viewsets import VuedaHistoryViewSet


class TimesheetViewSet(VuedaHistoryViewSet):
    queryset = Timesheet.objects.all()
    serializer_class = TimesheetSerializer
    permission_classes = [ObjectPermissions]


class ProductViewSet(VuedaHistoryViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [ObjectPermissions]
    filterset_class = ProductFilterSet
