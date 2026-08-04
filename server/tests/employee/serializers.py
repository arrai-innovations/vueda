from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from rest_flex_fields.serializers import FlexFieldsModelSerializer
from rest_framework import serializers

from tests.employee.models import Employee
from tests.employee.models import User
from vueda.core.serializers import VuedaHistorySerializer
from vueda.core.serializers import VuedaSerializer
from vueda.user.serializers import GroupSerializer


class EmployeeSerializer(VuedaHistorySerializer):
    class Meta(VuedaHistorySerializer.Meta):
        model = Employee
        fields = ["id", "user", "employee_number"] + VuedaHistorySerializer.Meta.fields


class UserWithGroupsSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = User
        fields = ["id", "email", "name", "groups"] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "groups": (GroupSerializer, {"many": True}),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)


class ContentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentType
        fields = ["id", "app_label", "model"]


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "name", "codename"]


class PermissionWithContentTypeSerializer(FlexFieldsModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "name", "codename", "content_type"]
        expandable_fields = {
            "content_type": ContentTypeSerializer,
        }


class UserWithPermissionsSerializer(VuedaSerializer):
    class Meta(VuedaSerializer.Meta):
        model = User
        fields = ["id", "email", "name", "user_permissions"] + VuedaSerializer.Meta.fields
        expandable_fields = {
            "user_permissions": (PermissionSerializer, {"many": True}),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)
