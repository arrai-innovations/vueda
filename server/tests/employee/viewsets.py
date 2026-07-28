from django.contrib.auth.models import Permission
from rest_framework.permissions import IsAuthenticated

from tests.employee.models import User
from tests.employee.serializers import PermissionWithContentTypeSerializer
from tests.employee.serializers import UserWithGroupsSerializer
from tests.employee.serializers import UserWithPermissionsSerializer
from vueda.core.viewsets import VuedaViewSet


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
