import drf_writable_nested
import rest_flex_fields.serializers as flex_serializers
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.contrib.auth import password_validation
from django.contrib.auth.models import Group
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from rest_framework.exceptions import ValidationError


User = get_user_model()


class NoExtraFieldsSerializerMixin:
    """
    Explode on extra fields, but it is not the default behavior of DRF.

    This lets us clean up client code or tests with extraneous keys.
    """

    def validate(self, attrs):
        attrs = super().validate(attrs)
        errors = {}
        if hasattr(self, "initial_data"):
            extra_keys = set(self.initial_data.keys()) - set(self.fields.keys())
            if hasattr(self, "_flex_options_rep_only"):
                extra_keys -= set(self._flex_options_rep_only["fields"])
                extra_keys -= set(self._flex_options_rep_only["expand"])
            for extra_key in extra_keys:
                if extra_key in errors:
                    errors[extra_key].append("Unexpected field.")
                else:
                    errors[extra_key] = ["Unexpected field."]
        if errors:
            raise ValidationError(errors)
        return attrs


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


class FlexFieldsWriteableNestedMixin(
    flex_serializers.FlexFieldsSerializerMixin,
    drf_writable_nested.NestedCreateMixin,
    drf_writable_nested.NestedUpdateMixin,
):
    """
    This is a utility mixin making a single class that makes serializers flex & nested writable.
    """

    def to_internal_value(self, data):
        """
        We want to apply flex fields to the serializer fields, but only if the
        serializer is being used in a view. We don't want to apply flex fields
        to the serializer fields if the serializer is being used as a nested
        serializer, because it should already have the flex fields applied.
        Double applying flex fields to the serializer fields will cause an error.
        """
        if not self._flex_fields_rep_applied:
            if "view" in self.context and isinstance(self, self.context["view"].serializer_class):
                self.apply_flex_fields(self.fields, self._flex_options_rep_only)
                self._flex_fields_rep_applied = True
        return super().to_internal_value(data)


class WhoAmISerializer(NoExtraFieldsSerializerMixin, serializers.ModelSerializer):
    """
    This is a serializer for the current user, it is simpler than the other user serializers.
    """

    groups = serializers.SlugRelatedField(many=True, queryset=Group.objects.all(), slug_field="name")

    class Meta:
        model = User
        fields = ["id", "email", "name", "groups", "is_superuser"]


class WhoIsSomeoneElseSerializer(NoExtraFieldsSerializerMixin, serializers.ModelSerializer):
    """
    This is a serializer for someone else, it is simpler than the other user serializers.
    It is generally used for looking up users by id and populating dropdowns.
    """

    class Meta:
        model = User
        fields = ["id", "email", "name"]


class UserSerializer(NoExtraFieldsSerializerMixin, FlexFieldsWriteableNestedMixin, serializers.ModelSerializer):
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


class ExcludeFieldsSerializerMixin:
    """
    Fields hidden or added by this Mixin are not shown in OPTIONS responses.
    https://github.com/encode/django-rest-framework/discussions/8606#discussioncomment-3899252
    """

    def get_extra_kwargs(self):
        kwargs = super().get_extra_kwargs()
        action = self.context["view"].action

        for exclude_actions in ["create", ["update", "partial_update"]]:
            for exclude_action in exclude_actions:
                exclude_for = getattr(self.Meta, f"exclude_{exclude_actions[0]}_fields", None)
                if action == exclude_action and exclude_for:
                    for field in exclude_for:
                        kwargs.setdefault(field, {})
                        kwargs[field]["read_only"] = True
        return kwargs
