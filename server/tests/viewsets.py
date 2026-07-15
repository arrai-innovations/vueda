from django.contrib.auth.models import Permission
from rest_framework.permissions import IsAuthenticated

from tests.filtersets import ProductFilterSet
from tests.models import Product
from tests.models import Timesheet
from tests.models import TimesheetEntry
from tests.models import User
from tests.serializers import PermissionWithContentTypeSerializer
from tests.serializers import ProductSerializer
from tests.serializers import TimesheetEntrySerializer
from tests.serializers import TimesheetSerializer
from tests.serializers import UserWithGroupsSerializer
from tests.serializers import UserWithPermissionsSerializer
from vueda.core.viewsets import VuedaHistoryViewSet
from vueda.core.viewsets import VuedaViewSet


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


class UserWithGroupsViewSet(VuedaViewSet):
    queryset = User.objects.all()
    serializer_class = UserWithGroupsSerializer
    permission_classes = [IsAuthenticated]
    permit_list_expands = ["groups"]


class UserWithPermissionsViewSet(VuedaViewSet):
    queryset = User.objects.all()
    serializer_class = UserWithPermissionsSerializer
    permission_classes = [IsAuthenticated]
    permit_list_expands = ["user_permissions"]


class PermissionWithContentTypeViewSet(VuedaViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionWithContentTypeSerializer
    permission_classes = [IsAuthenticated]
    permit_list_expands = ["content_type"]
