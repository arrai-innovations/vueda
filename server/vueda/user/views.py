"""Django and DRF views for user authentication, password management, and permission administration."""

__all__ = (
    "AllAuthAdapterDispatchMixin",
    "AllAuthLoginView",
    "AllAuthReauthenticateView",
    "AllAuthTwoFactorAuthView",
    "PermissionDeleteView",
    "PermissionOverviewView",
    "PermissionSaveView",
    "ResendWelcomeEmailView",
    "VuedaAllAuthViewAdapter",
    "VuedaForgotPasswordView",
    "VuedaResetPasswordView",
    "WhoIsView",
    "totp_code",
)

import json
import operator

from allauth.account.stages import LoginStageController
from allauth.headless.account.views import LoginView
from allauth.headless.account.views import ReauthenticateView
from allauth.headless.mfa.views import AuthenticateView
from allauth.mfa.internal.constants import LoginStageKey
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth import password_validation
from django.contrib.auth.forms import _unicode_ci_compare
from django.contrib.auth.mixins import PermissionRequiredMixin
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.contrib.postgres.aggregates import ArrayAgg
from django.core.cache import cache
from django.db.models import Case
from django.db.models import CharField
from django.db.models import F
from django.db.models import OuterRef
from django.db.models import Value
from django.db.models import When
from django.db.models.functions import Cast
from django.db.models.functions import StrIndex
from django.db.models.functions import Substr
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.utils.module_loading import import_string
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.debug import sensitive_variables
from django.views.generic import TemplateView
from django.views.generic.detail import SingleObjectMixin
from hashids import Hashids
from rest_framework import serializers
from rest_framework import status
from rest_framework import status as drf_status
from rest_framework.decorators import api_view
from rest_framework.decorators import permission_classes
from rest_framework.generics import GenericAPIView
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework.views import APIView

from vueda.core.db import Array
from vueda.core.exceptions import VuedaValidationError
from vueda.core.open_api import conditional_extend_schema_decorator
from vueda.core.open_api import conditional_inline_serializer
from vueda.core.open_api import conditional_open_api_types
from vueda.core.permissions import ObjectPermissions
from vueda.core.tokens import Sha3PasswordResetTokenGenerator
from vueda.user.adapters import get_adapter
from vueda.user.decorators import ensure_csrf_token
from vueda.user.mixins import LogoutMixin
from vueda.user.models import GroupChange
from vueda.user.permissions import Authenticating
from vueda.user.serializers import ForgotPasswordSerializer
from vueda.user.serializers import ResetPasswordSerializer
from vueda.user.utils import get_current_totp_code


User = get_user_model()


@conditional_extend_schema_decorator(
    summary="Get logged in user info",
)
@ensure_csrf_token
class WhoIsView(RetrieveAPIView):
    serializer_class = import_string(
        settings.REST_AUTH.get("USER_DETAILS_SERIALIZER", "vueda.user.serializers.WhoIsSerializer")
    )
    permission_classes = []

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if isinstance(instance, AnonymousUser):
            return Response({}, status=200)
        return super().retrieve(request, *args, **kwargs)

    def get_object(self):
        if self.request.user.pk:
            return get_user_model().objects.get(pk=self.request.user.pk)
        return self.request.user


@conditional_extend_schema_decorator(
    summary="Forgot password",
    responses={
        204: None,
        400: conditional_inline_serializer(
            "ForgotPasswordValidationError",
            fields={"email": serializers.ListField(child=serializers.CharField())},
        ),
        429: conditional_inline_serializer(
            "ForgotPasswordRateLimitError",
            fields={"detail": serializers.CharField()},
        ),
    },
)
class VuedaForgotPasswordView(GenericAPIView):
    serializer_class = ForgotPasswordSerializer
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        active_user = (
            get_user_model()
            .objects.filter(
                **{
                    "email__iexact": email,
                    "is_active": True,
                }
            )
            .first()
        )
        if (
            active_user is not None
            and active_user.has_usable_password()
            and _unicode_ci_compare(email, active_user.email)
        ):
            cache_key = f"password-forgot-cooldown:{email.lower()}"
            if cache.get(cache_key):
                return Response(
                    {"detail": "You must wait before requesting another password reset."},
                    status=drf_status.HTTP_429_TOO_MANY_REQUESTS,
                )

            url = active_user.generate_reset_url()
            context = {
                "user": active_user,
                "reset_url": url,
            }
            get_adapter().send_mail(email, active_user.name, "forgot_password", context)
            cache.set(cache_key, True, timeout=60)
        else:
            return Response({"email": ["Email not found or user is inactive. "]}, status=400)

        return Response(status=drf_status.HTTP_204_NO_CONTENT)


@conditional_extend_schema_decorator(
    methods=["GET"],
    summary="Validate reset token",
    responses={
        200: conditional_inline_serializer(
            "ResetTokenValid",
            fields={"detail": serializers.CharField()},
        ),
        400: conditional_inline_serializer(
            "ResetTokenInvalid",
            fields={"detail": serializers.CharField()},
        ),
    },
)
@conditional_extend_schema_decorator(
    methods=["POST"],
    summary="Reset password",
    responses={
        204: None,
        400: conditional_inline_serializer(
            "ResetPasswordValidationError",
            fields={"non_field_errors": serializers.ListField(child=serializers.CharField())},
        ),
    },
)
class VuedaResetPasswordView(GenericAPIView):
    serializer_class = ResetPasswordSerializer
    permission_classes = (AllowAny,)

    def get(self, request):
        token_validator = Sha3PasswordResetTokenGenerator()
        hashids = Hashids(min_length=16)

        pk = request.query_params.get("pk")
        token = request.query_params.get("token")
        if not pk or not token:
            return Response({"detail": "Missing parameters."}, status=drf_status.HTTP_400_BAD_REQUEST)

        try:
            uid = hashids.decode(pk)[0]
            user = get_user_model().objects.get(pk=uid)
        except (IndexError, get_user_model().DoesNotExist):
            return Response(
                {"detail": "This token is invalid or has already been used."},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )

        if token_validator.check_token(user, token):
            return Response({"detail": "Token is valid."}, status=drf_status.HTTP_200_OK)
        else:
            return Response(
                {"detail": "This token is invalid or has already been used."},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )

    @sensitive_variables("password", "token", "serializer.data")
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token_validator = Sha3PasswordResetTokenGenerator()
        hashids = Hashids(min_length=16)

        password = serializer.data["password"]
        pk = serializer.data["pk"]
        token = serializer.data["token"]

        try:
            uid = hashids.decode(pk)[0]
            user = get_user_model().objects.get(pk=uid)
        except (IndexError, get_user_model().DoesNotExist):
            non_field_error_key = api_settings.NON_FIELD_ERRORS_KEY
            return Response(
                {non_field_error_key: ["This token is invalid or has already been used."]},
                status=400,
            )

        if token_validator.check_token(user, token):
            password_validation.validate_password(password, user)

            user.set_password(password)
            user.save()

        else:
            non_field_error_key = api_settings.NON_FIELD_ERRORS_KEY

            return Response(
                {non_field_error_key: ["This token is invalid or has already been used."]},
                status=400,
            )

        return Response(status=drf_status.HTTP_204_NO_CONTENT)


@conditional_extend_schema_decorator(
    summary="Resend welcome email",
)
class ResendWelcomeEmailView(SingleObjectMixin, APIView):
    permission_classes = (IsAuthenticated, ObjectPermissions)
    model = User
    queryset = User.objects.all()
    action = f"{User.__class__.__name__}.create_user"

    def post(self, request, *args, **kwargs):
        try:
            user = self.get_object()
        except Exception as e:
            return Response({"result": "error", "message": str(e)}, content_type="application/json", status=404)

        try:
            user.send_welcome_email()
        except Exception as e:
            return Response({"result": "error", "message": str(e)}, content_type="application/json", status=500)

        return Response({"result": "success", "message": "Welcome email resent."}, content_type="application/json")


class PermissionOverviewView(LogoutMixin, PermissionRequiredMixin, TemplateView):
    """
    Provide an overview of permissions and groups for each type of object in the site.
    """

    template_name = "permissions/overview.jinja2"
    permission_required = ("user.list_permission",)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        local_apps = []
        for app_label in settings.LOCAL_APPS:
            if ".apps." in app_label:
                app_label = app_label.split(".apps.")[0]
                local_apps.append(app_label.split(".")[-1])
            else:
                local_apps.append(app_label)

        # We use this to get the table name without historical in it, so
        # we can group the historical and non-historical models together.
        index_after_historical = 11

        permissions = Permission.objects.annotate(
            underscore_index=StrIndex(F("codename"), Value("_")),
            codename_type=Substr(F("codename"), 1, length=F("underscore_index") - 1),
            is_historical=Case(
                When(
                    content_type__model__startswith="historical",
                    then=True,
                ),
                default=False,
            ),
            is_local_app=Case(
                When(
                    content_type__app_label__in=local_apps,
                    then=True,
                ),
                default=False,
            ),
            model_and_historical_model_group=Case(
                When(
                    is_historical=True,
                    then=(
                        ContentType.objects.filter(
                            app_label=OuterRef("content_type__app_label"),
                            model=Substr(OuterRef("content_type__model"), index_after_historical),
                        ).values_list("model", flat=True)
                    ),
                ),
                default=F("content_type__model"),
            ),
            crud_order_by=Case(
                When(
                    codename_type__in=("create", "add"),
                    then=0,
                ),
                When(
                    codename_type__in=("read", "view"),
                    then=1,
                ),
                When(
                    codename_type__in=("update", "change"),
                    then=2,
                ),
                When(
                    codename_type="delete",
                    then=3,
                ),
                When(
                    codename_type="list",
                    then=4,
                ),
                default=5,
            ),
            groups=ArrayAgg(
                Array(
                    Cast("group__pk", output_field=CharField()),
                    "group__name",
                ),
            ),
        ).order_by("content_type__app_label", "model_and_historical_model_group", "is_historical", "crud_order_by")

        context.update(
            {
                "categories": {
                    "My App": {},
                    "Other App": {},
                },
            }
        )
        permission_lists = {}  # So we can add to the same list.

        for pk, codename, name, app_label, model_name, groups, is_local_app, is_historical in permissions.values_list(
            "pk",
            "codename",
            "name",
            "content_type__app_label",
            "content_type__model",
            "groups",
            "is_local_app",
            "is_historical",
        ):
            destination = context["categories"]["My App" if is_local_app else "Other App"]
            if app_label not in destination:
                destination[app_label] = []
            key = (app_label, model_name)
            if key not in permission_lists:
                permissions = []
                permission_lists[(app_label, model_name)] = permissions
                destination[app_label].append(
                    {
                        "model_name": model_name,
                        "is_historical": is_historical,
                        "permissions": permissions,
                    }
                )

            # Groups can end up returning [[None, None]], so we need to clean them up.
            parsed_groups = []
            for group_id, group_name in groups:
                if group_name is not None:
                    parsed_groups.append([group_id, group_name])

            if parsed_groups:
                parsed_groups = sorted(parsed_groups, key=operator.itemgetter(1))

            permission_lists[(app_label, model_name)].append(
                {
                    "pk": pk,
                    "codename": codename,
                    "name": name,
                    "groups": parsed_groups,
                }
            )

        return context


class PermissionDeleteView(PermissionRequiredMixin, View):
    http_method_names = [
        "delete",
    ]
    permission_required = ("permission.delete_permission",)

    @method_decorator(csrf_exempt)
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)

    def delete(self, request, permission_id, group_id, *args, **kwargs):
        permission = Permission.objects.filter(pk=permission_id).first()
        if permission is None:
            return JsonResponse(
                {
                    "state": "erred",
                    "errors": ["Unable to find the permission for the group you want to delete."],
                },
                status=400,
            )

        group = Group.objects.filter(pk=group_id).first()
        if group is None:
            return JsonResponse(
                {
                    "state": "erred",
                    "errors": ["Unable to find the group to delete."],
                },
                status=400,
            )

        group_name = group.name
        permission.group_set.remove(group)

        obj_is_used = group.permissions.exists()

        GroupChange.objects.create(
            group_name=group_name,
            change_type=GroupChange.UNASSOCIATED if obj_is_used else GroupChange.DELETED,
            historical_permission_codename=permission.codename,
            historical_permission_content_type_app_label=permission.content_type.app_label,
            historical_permission_content_type_model_name=permission.content_type.model,
        )

        # if not obj_is_used:
        #     group.delete()

        return JsonResponse({"state": "succeeded"})


class PermissionSaveView(PermissionRequiredMixin, View):
    permission_required = ("permission.create_group", "permission.update_group")

    @method_decorator(csrf_exempt)
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        try:
            return self._post(request, *args, **kwargs)
        except Exception as e:
            return JsonResponse(
                {
                    "state": "erred",
                    "errors": [str(e)],
                },
                status=400,
            )

    def _post(self, request, *args, **kwargs):
        data = request.body
        data = data.decode("utf-8")
        data = json.loads(data)

        permission_id = data["permissionId"]
        group_id = data["groupId"]
        group_name = data["groupName"]

        errors = []
        try:
            permission_id = int(permission_id)
        except ValueError:
            errors.append("permission_id must be the string of a number.")

        if group_id is not None:
            try:
                group_id = int(group_id)
            except ValueError:
                errors.append("group_id must be the string of a number.")

        if not len(group_name.strip()):
            errors.append("group_name must not be empty.")

        if errors:
            return JsonResponse(
                {
                    "state": "erred",
                    "errors": errors,
                },
                status=400,
            )

        permission = Permission.objects.filter(pk=permission_id).first()
        if permission is None:
            return JsonResponse(
                {
                    "state": "erred",
                    "errors": ["Unable to find the permission for the group you want to change."],
                },
                status=400,
            )

        if group_id is None:  # New Group
            # Check to see if there is already an association between the group and permission.
            # If there is, then you are trying to add it twice.  The group change records will
            # have a record that doesn't make sense in that case.
            group, created = Group.objects.get_or_create(name=group_name)
            if group.permissions.filter(pk=permission.pk).exists():
                return JsonResponse(
                    {
                        "state": "erred",
                        "errors": [
                            f"You already have an association between &quot;{group_name}&quot; and this permission."
                        ],
                    },
                    status=400,
                )

            permission.group_set.add(group)
            GroupChange.objects.create(
                group_name=group_name,
                change_type=GroupChange.ADDED if created else GroupChange.ASSOCIATED,
                historical_permission_codename=permission.codename,
                historical_permission_content_type_app_label=permission.content_type.app_label,
                historical_permission_content_type_model_name=permission.content_type.model,
            )

            return JsonResponse(
                {
                    "state": "succeeded",
                    "group_id": str(group.pk),
                }
            )

        group = Group.objects.filter(pk=group_id).first()
        if group is None:
            return JsonResponse(
                {
                    "state": "erred",
                    "errors": ["Unable to find the group to change."],
                },
                status=400,
            )
        group_name_old = group.name
        group.name = group_name
        if group_name != group_name_old:
            if Permission.objects.filter(group__name=group_name, pk=permission.pk).exists():
                return JsonResponse(
                    {
                        "state": "erred",
                        "errors": [
                            f"You already have an association between &quot;{group_name}&quot; and this permission."
                        ],
                    },
                    status=400,
                )

            group.save()
            permission.group_set.add(group)

            GroupChange.objects.create(
                group_name=group_name,
                group_name_old=group_name_old,
                change_type=GroupChange.CHANGED,
                historical_permission_codename=permission.codename,
                historical_permission_content_type_app_label=permission.content_type.app_label,
                historical_permission_content_type_model_name=permission.content_type.model,
            )

        return JsonResponse(
            {
                "state": "succeeded",
                "group_id": str(group.pk),
                "new_name": group_name,
            }
        )


class VuedaAllAuthViewAdapter(APIView):
    def dispatch(self, request, *args, **kwargs):
        return View.dispatch(self, request, *args, **kwargs)


class AllAuthAdapterDispatchMixin:
    def dispatch(self, request, *args, **kwargs):
        try:
            return super().dispatch(request, *args, **kwargs)
        except Exception as exc:
            self.headers = self.default_response_headers
            response = self.handle_exception(exc)
            return self.finalize_response(request, response, *args, **kwargs)

    def handle_invalid_input(self, data):
        # Some of the AllAuth views use customized invalid input handler to record invalid attempts.
        super().handle_invalid_input(data)
        errors = {}
        for field, error_list in data.errors.items():
            errors[field] = error_list
        raise VuedaValidationError(errors)


@conditional_extend_schema_decorator(summary="Log in", responses={200: conditional_open_api_types().OBJECT})
class AllAuthLoginView(AllAuthAdapterDispatchMixin, LoginView, VuedaAllAuthViewAdapter):
    pass


@conditional_extend_schema_decorator(
    summary="Verify two-factor authentication", responses={200: conditional_open_api_types().OBJECT}
)
class AllAuthTwoFactorAuthView(AllAuthAdapterDispatchMixin, AuthenticateView, VuedaAllAuthViewAdapter):
    pass


@conditional_extend_schema_decorator(summary="Re-authenticate", responses={200: conditional_open_api_types().OBJECT})
class AllAuthReauthenticateView(AllAuthAdapterDispatchMixin, ReauthenticateView, VuedaAllAuthViewAdapter):
    pass


@conditional_extend_schema_decorator(
    methods=["GET"],
    summary="List available TOTP delivery methods",
    responses={
        200: conditional_inline_serializer(
            "TotpMethodsResponse",
            fields={"methods": serializers.ListField(child=serializers.CharField())},
        )
    },
)
@conditional_extend_schema_decorator(methods=["POST"], summary="Send a TOTP code", responses={204: None})
@api_view(["GET", "POST"])
@permission_classes([Authenticating])
def totp_code(request):
    stage = LoginStageController.enter(request, LoginStageKey.MFA_AUTHENTICATE.value)
    user = stage.login.user
    devices = user.totp_devices
    if not devices.exists():
        return Response({"detail": "No TOTP device found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        methods = list(devices.values_list("method", flat=True))
        return Response({"methods": methods}, status=status.HTTP_200_OK)
    method = request.data.get("method")
    device = devices.filter(method=method).select_related("authenticator").first()
    if not device:
        return Response({"detail": "No device for requested method"}, status=status.HTTP_400_BAD_REQUEST)

    authenticator = device.authenticator
    secret = authenticator.data.get("secret")
    code = get_current_totp_code(secret)
    context = {"code": code}
    adapter = get_adapter()
    send_action = {
        "email": lambda: adapter.send_mail(device.email, user.name, "totp_code", context),
        "sms": lambda: adapter.send_sms(device.phone_number, user.name, "totp_code", context),
    }.get(method)
    if not send_action:
        return Response({"detail": "Unsupported method"}, status=status.HTTP_400_BAD_REQUEST)
    send_action()
    return Response(status=status.HTTP_204_NO_CONTENT)
