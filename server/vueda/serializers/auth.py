from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework import serializers

from vueda.serializers.flex import NoExtraFieldsSerializerMixin
from vueda.serializers.history import SimpleHistorySerializerMixin


User = get_user_model()


class WhoAmISerializer(NoExtraFieldsSerializerMixin, SimpleHistorySerializerMixin, serializers.ModelSerializer):
    groups = serializers.SlugRelatedField(many=True, queryset=Group.objects.all(), slug_field="name")

    class Meta:
        model = User
        fields = ["id", "email", "name", "groups", "is_superuser"] + SimpleHistorySerializerMixin.Meta.fields
