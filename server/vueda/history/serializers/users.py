"""History-aware user serializers that extend the core user serializers."""

__all__ = (
    "UserHistoricalSerializer",
    "UserSerializer",
    "WhoIsSerializer",
)

from rest_framework import serializers

from vueda.history.serializers.mixins import SimpleHistorySerializerMixin
from vueda.user.serializers import User
from vueda.user.serializers import UserSerializer as CoreUserSerializer
from vueda.user.serializers import WhoIsSerializer as CoreWhoIsSerializer


class UserSerializer(SimpleHistorySerializerMixin, CoreUserSerializer):
    """
    This is a serializer adding historical records to the core user serializer.

    This decoupling helps make the history app optional.
    """

    class Meta(CoreUserSerializer.Meta):
        fields = CoreUserSerializer.Meta.fields + SimpleHistorySerializerMixin.Meta.fields


class UserHistoricalSerializer(serializers.ModelSerializer):
    """
    This is a serializer for the historical records of a user.
    """

    id = serializers.IntegerField(source="history_id")
    user_id = serializers.IntegerField(source="id")

    class Meta:
        model = User.history.model
        fields = ["id", "last_login", "user_id"]


class WhoIsSerializer(
    SimpleHistorySerializerMixin,
    CoreWhoIsSerializer,
):
    """
    This decoupling helps make the history app optional.
    """

    class Meta(CoreWhoIsSerializer.Meta):
        fields = CoreWhoIsSerializer.Meta.fields + SimpleHistorySerializerMixin.Meta.fields
