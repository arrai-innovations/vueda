"""Django and DRF views for user authentication, password management, and permission administration."""

__all__ = (
    "AllAuthAdapterDispatchMixin",
    "AllAuthLoginView",
    "AllAuthMFAReauthenticateView",
    "AllAuthReauthenticateView",
    "AllAuthRecoveryCodesView",
    "AllAuthTwoFactorAuthView",
    "PermissionDeleteView",
    "PermissionOverviewView",
    "PermissionSaveView",
    "ResendWelcomeEmailView",
    "VuedaAllAuthViewAdapter",
    "VuedaForgotPasswordView",
    "VuedaPasswordChangeView",
    "VuedaResetPasswordView",
    "WhoIsView",
    "totp_code",
)

import json
import operator

from allauth.account.internal.stagekit import get_pending_stage
from allauth.account.stages import LoginStageController
from allauth.core.exceptions import ReauthenticationRequired
from allauth.headless.account.views import LoginView
from allauth.headless.account.views import ReauthenticateView
from allauth.headless.mfa.views import AuthenticateView
from allauth.headless.mfa.views import ManageRecoveryCodesView
from allauth.headless.mfa.views import ReauthenticateView as MFAReauthenticateView
from allauth.mfa.internal.constants import LoginStageKey
from dj_rest_auth.views import PasswordChangeView
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
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Case
from django.db.models import CharField
from django.db.models import F
from django.db.models import OuterRef
from django.db.models import Q
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
from vueda.core.reauthentication import did_recently_authenticate
from vueda.core.tokens import Sha3PasswordResetTokenGenerator
from vueda.history.revision import annotate_object_revision
from vueda.user.adapters import get_adapter
from vueda.user.decorators import ensure_csrf_token
from vueda.user.globals import APPS_MODELS_AND_PERMISSION_CODENAMES_TO_HIDE_FROM_PERMISSION_MANAGEMENT
from vueda.user.globals import CUD_CODENAMES
from vueda.user.mixins import LogoutMixin
from vueda.user.models import GroupChange
from vueda.user.permissions import Authenticating
from vueda.user.schema import RateLimitedSerializer
from vueda.user.serializers import ForgotPasswordSerializer
from vueda.user.serializers import ResetPasswordSerializer
from vueda.user.throttles import ClientIPScopedRateThrottle
from vueda.user.throttles import throttle_code_send
from vueda.user.utils import get_current_totp_code


User = get_user_model()


@conditional_extend_schema_decorator(
    summary="Get logged in user info",
)
@ensure_csrf_token
class WhoIsView(RetrieveAPIView):
    """
    Describe the current session: the signed-in user through ``WhoIsSerializer``, or, for an anonymous
    session, an object holding only ``auth_pending_flow``. For an anonymous session that is the stage allauth
    holds a sign-in at, such as ``mfa_authenticate``, or ``None`` when no sign-in is waiting. The stage lives
    only in the server session, so the client reads it from here to resume the sign-in after a reload.
    """

    serializer_class = import_string(
        settings.REST_AUTH.get("USER_DETAILS_SERIALIZER", "vueda.user.serializers.WhoIsSerializer")
    )
    permission_classes = []

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if isinstance(instance, AnonymousUser):
            stage = get_pending_stage(request)
            return Response({"auth_pending_flow": stage.key if stage else None}, status=status.HTTP_200_OK)
        return super().retrieve(request, *args, **kwargs)

    def get_object(self):
        if self.request.user.pk:
            return annotate_object_revision(get_user_model().objects.filter(pk=self.request.user.pk)).get()
        return self.request.user


@conditional_extend_schema_decorator(
    summary="Forgot password",
    responses={
        204: None,
        400: conditional_inline_serializer(
            "ForgotPasswordValidationError",
            fields={"email": serializers.ListField(child=serializers.CharField())},
        ),
        429: RateLimitedSerializer,
    },
)
class VuedaForgotPasswordView(GenericAPIView):
    """
    Email a password reset link to the active account with the given address.

    The response is the same whether or not an account matches, so the endpoint does not reveal
    which addresses have accounts. The one-minute cooldown applies to every address for the same
    reason. The ``forgot_password`` throttle rate limits how many requests one IP address can make.
    """

    serializer_class = ForgotPasswordSerializer
    permission_classes = (AllowAny,)
    throttle_classes = (ClientIPScopedRateThrottle,)
    throttle_scope = "forgot_password"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        cache_key = f"password-forgot-cooldown:{email.lower()}"
        if cache.get(cache_key):
            return Response(
                {"detail": "You must wait before requesting another password reset."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        cache.set(cache_key, True, timeout=60)

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
            context = {
                "user": active_user,
                "reset_url": active_user.generate_reset_url(),
            }
            get_adapter().send_mail(email, active_user.name, "forgot_password", context)

        return Response(status=status.HTTP_204_NO_CONTENT)


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
            fields={
                "non_field_errors": serializers.ListField(child=serializers.CharField(), required=False),
                "password": serializers.ListField(child=serializers.CharField(), required=False),
            },
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
            return Response({"detail": "Missing parameters."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = hashids.decode(pk)[0]
            user = get_user_model().objects.get(pk=uid)
        except (IndexError, get_user_model().DoesNotExist):
            return Response(
                {"detail": "This token is invalid or has already been used."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if token_validator.check_token(user, token):
            return Response({"detail": "Token is valid."}, status=status.HTTP_200_OK)
        else:
            return Response(
                {"detail": "This token is invalid or has already been used."},
                status=status.HTTP_400_BAD_REQUEST,
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
                status=status.HTTP_400_BAD_REQUEST,
            )

        if token_validator.check_token(user, token):
            # The serializer validated the password without the user. Validators that compare it with
            # the account, such as UserAttributeSimilarityValidator, can only run here.
            try:
                password_validation.validate_password(password, user)
            except DjangoValidationError as error:
                return Response({"password": list(error.messages)}, status=status.HTTP_400_BAD_REQUEST)

            user.set_password(password)
            user.save()

        else:
            non_field_error_key = api_settings.NON_FIELD_ERRORS_KEY

            return Response(
                {non_field_error_key: ["This token is invalid or has already been used."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


@conditional_extend_schema_decorator(
    summary="Change password",
    responses={
        200: conditional_inline_serializer("PasswordChanged", fields={"detail": serializers.CharField()}),
        400: conditional_open_api_types().OBJECT,
        429: RateLimitedSerializer,
    },
)
class VuedaPasswordChangeView(PasswordChangeView):
    """
    Change the signed-in user's password after confirming their current one.

    The ``change_password`` throttle rate limits how many requests one user can make, so a caller who
    holds a signed-in session cannot guess the current password through this endpoint.
    """

    throttle_classes = (ClientIPScopedRateThrottle,)
    throttle_scope = "change_password"


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
            return Response(
                {"result": "error", "message": str(e)},
                content_type="application/json",
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            user.send_welcome_email()
        except Exception as e:
            return Response(
                {"result": "error", "message": str(e)},
                content_type="application/json",
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"result": "success", "message": "Welcome email resent."}, content_type="application/json")


class PermissionOverviewView(LogoutMixin, PermissionRequiredMixin, TemplateView):
    """
    Provide an overview of permissions and groups for each type of object in the site.
    """

    template_name = "permissions/overview.jinja2"
    permission_required = ("auth.list_permission",)

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

        # Exclude certain models and permissions from being able to have groups added to them.
        excluded = Q()
        for app_label, model, codename in APPS_MODELS_AND_PERMISSION_CODENAMES_TO_HIDE_FROM_PERMISSION_MANAGEMENT:
            match codename:
                case "*":
                    excluded |= Q(content_type__app_label=app_label, content_type__model=model)
                case "CUD":
                    for cud_codename in CUD_CODENAMES:
                        excluded |= Q(
                            content_type__app_label=app_label,
                            content_type__model=model,
                            codename__startswith=cud_codename,
                            codename__endswith=f"_{model}",
                        )
                case _:
                    excluded |= Q(
                        content_type__app_label=app_label,
                        content_type__model=model,
                        codename__startswith=codename,
                        codename__endswith=f"_{model}",
                    )

        permissions = (
            Permission.objects.exclude(excluded)
            .annotate(
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
            )
            .order_by("content_type__app_label", "model_and_historical_model_group", "is_historical", "crud_order_by")
        )

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
    permission_required = ("auth.delete_permission",)

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
                status=status.HTTP_400_BAD_REQUEST,
            )

        group = Group.objects.filter(pk=group_id).first()
        if group is None:
            return JsonResponse(
                {
                    "state": "erred",
                    "errors": ["Unable to find the group to delete."],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        group_name = group.name
        permission.group_set.remove(group)

        # Removing a permission never deletes the group, even its last one: the group's user
        # memberships would go with it, and no group migration can restore them.
        GroupChange.objects.create(
            group_name=group_name,
            change_type=GroupChange.UNASSOCIATED,
            historical_permission_codename=permission.codename,
            historical_permission_content_type_app_label=permission.content_type.app_label,
            historical_permission_content_type_model_name=permission.content_type.model,
        )

        return JsonResponse({"state": "succeeded"})


class PermissionSaveView(PermissionRequiredMixin, View):
    permission_required = ("auth.create_group", "auth.update_group")

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
                status=status.HTTP_400_BAD_REQUEST,
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
                status=status.HTTP_400_BAD_REQUEST,
            )

        permission = Permission.objects.filter(pk=permission_id).first()
        if permission is None:
            return JsonResponse(
                {
                    "state": "erred",
                    "errors": ["Unable to find the permission for the group you want to change."],
                },
                status=status.HTTP_400_BAD_REQUEST,
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
                    status=status.HTTP_400_BAD_REQUEST,
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
                status=status.HTTP_400_BAD_REQUEST,
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
                    status=status.HTTP_400_BAD_REQUEST,
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


@conditional_extend_schema_decorator(
    summary="Re-authenticate with the password", responses={200: conditional_open_api_types().OBJECT}
)
class AllAuthReauthenticateView(AllAuthAdapterDispatchMixin, ReauthenticateView, VuedaAllAuthViewAdapter):
    """
    Confirm the signed-in user's password and record a ``password`` authentication in the session.

    This satisfies ``recent_auth_required`` for a user whose required flow is ``reauthenticate``. A user with
    an MFA authenticator must use ``AllAuthMFAReauthenticateView`` instead; this view still accepts their
    password, but the record it writes does not count for them.
    """


@conditional_extend_schema_decorator(
    summary="Re-authenticate with a second factor", responses={200: conditional_open_api_types().OBJECT}
)
class AllAuthMFAReauthenticateView(AllAuthAdapterDispatchMixin, MFAReauthenticateView, VuedaAllAuthViewAdapter):
    """
    Confirm a TOTP or recovery ``code`` for the signed-in user and record an ``mfa`` authentication in the
    session.

    This satisfies ``recent_auth_required`` for a user whose required flow is ``mfa_reauthenticate``.
    """


class AllAuthRecoveryCodesView(AllAuthAdapterDispatchMixin, ManageRecoveryCodesView, VuedaAllAuthViewAdapter):
    """
    View (GET) or regenerate (POST) the signed-in user's recovery codes, after the reauthentication VUEDA requires.

    The session must hold a recent record of the user's required flow, the same check ``recent_auth_required``
    applies, so a user with an MFA authenticator must have confirmed a second factor. Otherwise the view returns
    allauth's 401 reauthentication response, which lists the available flows. Every other response keeps
    allauth's format.
    """

    def handle(self, request, *args, **kwargs):
        if not did_recently_authenticate(request):
            raise ReauthenticationRequired()
        return super().handle(request, *args, **kwargs)


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
@conditional_extend_schema_decorator(
    methods=["POST"], summary="Send a TOTP code", responses={204: None, 429: RateLimitedSerializer}
)
@api_view(["GET", "POST"])
@permission_classes([Authenticating | IsAuthenticated])
def totp_code(request):
    """List the TOTP delivery methods for the user who is logging in or reauthenticating, or send them a code.

    The user is the one in the pending two-factor login stage, or the signed-in user when no login is
    pending, which is the case while they reauthenticate with a second factor. GET returns the methods of
    the user's TOTP devices. POST sends a current code by the requested ``method``, email or sms.
    """
    stage = LoginStageController.enter(request, LoginStageKey.MFA_AUTHENTICATE.value)
    user = stage.login.user if stage is not None else request.user
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
    throttle_code_send(request, user, method)
    send_action()
    return Response(status=status.HTTP_204_NO_CONTENT)
