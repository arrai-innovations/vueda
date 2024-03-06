from tests.models import Product
from tests.models import Timesheet
from tests.serializers import ProductSerializer
from tests.serializers import TimesheetSerializer
from vueda.core.permissions import ObjectPermissions
from vueda.core.viewsets import VuedaViewSet


class TimesheetViewSet(VuedaViewSet):
    queryset = Timesheet.objects.all()
    serializer_class = TimesheetSerializer
    permission_classes = [ObjectPermissions]


class ProductViewSet(VuedaViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [ObjectPermissions]
