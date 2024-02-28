from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.contrib.auth import password_validation
from django.contrib.auth.models import Group
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from vueda.core.serializers import FlexFieldsWriteableNestedSerializerMixin
from vueda.core.serializers import NoExtraFieldsSerializerMixin


User = get_user_model()


class LoginSerializer(serializers.Serializer):
    """
    This is a custom login serializer that uses the email instead of the username.
    """

    email = serializers.EmailField()
    password = serializers.CharField(style={"input_type": "password"})

    def validate(self, attrs):
        attrs = super().validate(attrs)
        email = attrs.get("email")
        password = attrs.get("password")
        user = authenticate(self.context["request"], username=email, password=password)

        if not user:
            msg = _("Invalid email or password, or user is inactive.")
            raise serializers.ValidationError(msg)

        attrs["user"] = user
        return attrs


class WhoIsSerializer(NoExtraFieldsSerializerMixin, serializers.ModelSerializer):
    """
    This is a serializer for the current user, it is simpler than the other user serializers.
    """

    groups = serializers.SlugRelatedField(many=True, queryset=Group.objects.all(), slug_field="name")

    class Meta:
        model = User
        fields = ["id", "email", "name", "groups", "is_superuser"]

    def get_fields(self):
        fields = super().get_fields()

        user = None
        if "request" in self.context and self.context["request"].user:
            user = self.context["request"].user

        if user != self.instance:
            del fields["groups"]
            del fields["is_superuser"]

        return fields


class UserSerializer(
    NoExtraFieldsSerializerMixin, FlexFieldsWriteableNestedSerializerMixin, serializers.ModelSerializer
):
    password_confirm = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "name",
            "password",
            "date_joined",
            "is_active",
            "groups",
            "last_login",
            "password_confirm",
        ]
        read_only_fields = ["date_joined"]
        extra_kwargs = {"password": {"write_only": True, "required": False}}

    def validate_password(self, value):
        try:
            password_validation.validate_password(value, self.instance)
        except ValidationError as err:
            raise serializers.ValidationError(" ".join(err))
        return value

    def validate_password_confirm(self, value):
        password = self.initial_data.get("password")
        if password != value:
            raise serializers.ValidationError("Password and Confirm Password must be the same.")
        return value

    def create(self, validated_data):
        if "password_confirm" in validated_data:
            validated_data.pop("password_confirm")
        # todo: if there are groups the user shouldn't be able to add, we should validate that before here.
        user = User.objects.create_user(**validated_data)
        # the queryset can have additional directives that change the result of the instance,
        #  vs the user instance we got from create_user.
        # if this returns None, check get_queryset filters / joins; it is not related to django caching.
        return self.context["view"].get_queryset().filter(id=user.id).first()

    def update(self, instance, validated_data):
        if "password" in validated_data:
            password = validated_data.pop("password")
            instance.set_password(password)
        if "password_confirm" in validated_data:
            validated_data.pop("password_confirm")
        return super().update(instance, validated_data)


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ["id", "name"]


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    password = serializers.CharField()
    password_confirm = serializers.CharField()
    pk = serializers.CharField()
    token = serializers.CharField()

    class Meta:
        extra_kwargs = {"password": {"write_only": True, "required": True}, "password_confirm": {"required": True}}

    def validate(self, data):
        if data["password"] > data["password_confirm"]:
            raise serializers.ValidationError("Password and Confirm Password must be the same.")

        return data

    def validate_password(self, value):
        try:
            password_validation.validate_password(value, self.instance)
        except ValidationError as err:
            raise serializers.ValidationError(" ".join(err))
        return value
