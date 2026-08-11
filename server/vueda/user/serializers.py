"""DRF serializers for user authentication, profile management, and TOTP devices."""

__all__ = (
    "AuthenticatorSerializer",
    "ForgotPasswordSerializer",
    "GroupSerializer",
    "LoginSerializer",
    "ResetPasswordSerializer",
    "TOTPDeviceSerializer",
    "TOTPSetupSerializer",
    "UserSerializer",
    "VuedaTokenSerializer",
    "WhoIsSerializer",
)

from collections.abc import Mapping

from allauth.account.internal.flows.reauthentication import did_recently_authenticate
from allauth.mfa.models import Authenticator
from dj_rest_auth.serializers import TokenSerializer
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.contrib.auth import password_validation
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.utils.translation import gettext_lazy as _
from phonenumber_field.validators import validate_international_phonenumber
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from vueda.core.exceptions import VuedaValidationError
from vueda.core.serializers import FormattedNameSerializerMixin
from vueda.core.serializers import VuedaExpandableFieldsSerializerMixin
from vueda.core.serializers import VuedaSerializer
from vueda.user.fields import TOTPMethodChoiceField
from vueda.user.models import TOTPDevice


User = get_user_model()


class LoginSerializer(serializers.Serializer):
    """
    This is a custom login serializer that uses the email instead of the username.

    These fields are required to authenticate a user.
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
            raise VuedaValidationError(msg)

        attrs["user"] = user
        return attrs


class WhoIsSerializer(VuedaSerializer):
    """
    This is a serializer for the current user, it is simpler than the other user serializers.

    These fields give the user information about themselves, after they login or when they return to the site.
    """

    groups = serializers.SlugRelatedField(many=True, queryset=Group.objects.all(), slug_field="name")
    recently_logged_in = serializers.SerializerMethodField()

    class Meta(VuedaSerializer.Meta):
        model = User
        fields = [
            "id",
            "email",
            "name",
            "groups",
            "is_superuser",
            "totp_devices",
            "recently_logged_in",
        ] + VuedaSerializer.Meta.fields

    def get_fields(self):
        fields = super().get_fields()

        user = None
        if "request" in self.context and self.context["request"].user:
            user = self.context["request"].user

        if user != self.instance:
            del fields["groups"]
            del fields["is_superuser"]
            del fields["available_actions"]

        return fields

    def get_recently_logged_in(self, _):
        if "request" in self.context and self.context["request"].user:
            return did_recently_authenticate(self.context["request"])
        return None


class UserSerializer(VuedaSerializer):
    """
    This is a public API, don't just change it without considering the impact.

    This is used to list, create, update, and delete users.
    """

    password_confirm = serializers.CharField(write_only=True, required=False)
    send_welcome_email_on_create = serializers.BooleanField(write_only=True, required=False, default=False)
    TEMPORARY_PASSWORD = "TEMPORARY_DUMMY_PASSWORD"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._used_temp_password = False

    class Meta(VuedaSerializer.Meta):
        model = User
        fields = [
            "id",
            "email",
            "name",
            "password",
            "date_joined",
            "is_active",
            "last_login",
            "password_confirm",
            "send_welcome_email_on_create",
        ] + VuedaSerializer.Meta.fields
        read_only_fields = ["date_joined"]
        extra_kwargs = {"password": {"write_only": True, "required": False}}
        expandable_fields = {
            "groups": (
                serializers.SlugRelatedField,
                {"many": True, "queryset": Group.objects.all(), "slug_field": "name"},
            ),
        }
        expandable_fields.update(VuedaSerializer.Meta.expandable_fields)

    def to_internal_value(self, data):
        self._used_temp_password = False
        # Guard against non-mapping data (e.g. a bare pk submitted while this field is expanded)
        # so the base serializer's own "Expected a dictionary" validation error can be raised,
        # rather than an AttributeError from calling .get() below.
        if self.instance is None and isinstance(data, Mapping):
            send_welcome_email = data.get("send_welcome_email_on_create", False)
            password = data.get("password")

            if send_welcome_email and not password:
                data["password"] = self.TEMPORARY_PASSWORD
                data["password_confirm"] = self.TEMPORARY_PASSWORD
                self._used_temp_password = True

        return super().to_internal_value(data)

    def validate_password(self, value):
        try:
            password_validation.validate_password(value, self.instance)
        except ValidationError as err:
            raise VuedaValidationError(" ".join(err))
        return value

    def validate_password_confirm(self, value):
        password = self.initial_data.get("password")
        if password != value:
            raise VuedaValidationError("Password and Confirm Password must be the same.")
        return value

    def create(self, validated_data):
        if "password_confirm" in validated_data:
            validated_data.pop("password_confirm")
        send_welcome_email_on_create = validated_data.pop("send_welcome_email_on_create", False)
        # todo: if there are groups the user shouldn't be able to add, we should validate that before here.
        with transaction.atomic():
            user = User.objects.create_user(**validated_data)
            if self._used_temp_password:
                user.set_unusable_password()
                user.save()
            if send_welcome_email_on_create:
                user.send_welcome_email()
        return user

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
        if data["password"] != data["password_confirm"]:
            raise VuedaValidationError("Password and Confirm Password must be the same.")

        return data

    def validate_password(self, value):
        try:
            password_validation.validate_password(value, self.instance)
        except ValidationError as err:
            raise VuedaValidationError(" ".join(err))
        return value


# If you have "TOKEN_MODEL": None in settings, then you will need to
# use this token serializer in order to generate API documentation.
# https://github.com/iMerica/dj-rest-auth/issues/517
class VuedaTokenSerializer(TokenSerializer, serializers.ModelSerializer):
    def get_fields(self):
        return {}


class AuthenticatorSerializer(serializers.Serializer):
    class Meta:
        model = Authenticator
        fields = ["id", "created_at", "last_used_at", "type"]


class TOTPSetupSerializer(serializers.Serializer):
    method = TOTPMethodChoiceField(
        required=True,
    )
    destination = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        method = data.get("method")
        destination = data.get("destination")

        if method == "email":
            if not destination:
                raise VuedaValidationError({"destination": "Email address is required for email method."})
            try:
                validate_email(destination)
            except DjangoValidationError:
                raise VuedaValidationError({"destination": "Enter a valid email address."})

        elif method == "sms":
            if not destination:
                raise VuedaValidationError({"destination": "Phone number is required for SMS method."})

            try:
                validate_international_phonenumber(destination)
            except DjangoValidationError:
                raise VuedaValidationError({"destination": "Enter a valid phone number."})

        return data


class TOTPDeviceSerializer(
    serializers.ModelSerializer, VuedaExpandableFieldsSerializerMixin, FormattedNameSerializerMixin
):
    created_at = serializers.SerializerMethodField()
    last_used_at = serializers.SerializerMethodField()
    method = TOTPMethodChoiceField()
    formatted_name = serializers.SerializerMethodField()

    class Meta:
        model = TOTPDevice
        fields = [
            "id",
            "created_at",
            "method",
            "last_used_at",
            "user",
            "phone_number",
            "email",
            "formatted_name",
        ]
        read_only_fields = fields

    def get_created_at(self, obj):
        return obj.authenticator.created_at

    def get_last_used_at(self, obj):
        return obj.authenticator.last_used_at
