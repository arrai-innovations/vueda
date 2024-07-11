import json
import operator
import os

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
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.debug import sensitive_variables
from django.views.generic import TemplateView
from django.views.generic.detail import SingleObjectMixin
from hashids import Hashids
from rest_framework.generics import GenericAPIView
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from vueda.core.db import Array
from vueda.core.open_api import conditional_extend_schema_decorator
from vueda.core.permissions import ObjectPermissions
from vueda.core.tokens import Sha3PasswordResetTokenGenerator
from vueda.user.mixins import LogoutMixin
from vueda.user.models import GroupChange
from vueda.user.serializers import ForgotPasswordSerializer
from vueda.user.serializers import ResetPasswordSerializer
from vueda.user.serializers import WhoIsSerializer


User = get_user_model()


@conditional_extend_schema_decorator(
    summary="Get logged in user info",
)
class WhoIsView(RetrieveAPIView):
    serializer_class = WhoIsSerializer
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
)
class ForgotPasswordView(GenericAPIView):
    serializer_class = ForgotPasswordSerializer
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            email = request.data.get("email", None)

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
                token_generator = Sha3PasswordResetTokenGenerator()
                hashids = Hashids(min_length=16)
                url = (  # noqa
                    os.path.join(
                        f"https://{settings.FRONTEND_DOMAIN}/{settings.FRONTEND_RESET_URL}",
                        hashids.encode(active_user.pk),
                    )
                    + "?token="
                    + token_generator.make_token(active_user)
                )
                # todo: send email
                # email = EmailMessageModel.objects.create(
                #     subject=f"Password reset request for {settings.FRONTEND_DOMAIN}",
                #     from_email=settings.DEFAULT_FROM_EMAIL,
                #     to=[active_user.email],
                #     body=f"""A password reset has been requested for your account at {settings.FRONTEND_DOMAIN}.
                #
                #     If this was not you, ignore this email and nothing will happen.  This link expires in 1 day.
                #
                #     To initiate the password reset process, click the link below:
                #
                #     {url}
                #
                #     If clicking the link above doesn't work, please copy and paste the URL in a browser window instead.
                #     """,
                # )
                #
                # email.send_email()
        except Exception as e:
            return Response({"result": "error", "message": str(e)}, content_type="application/json", status=500)

        return Response({"result": "success", "message": "Forgot Password Email Sent"}, content_type="application/json")


@conditional_extend_schema_decorator(
    summary="Reset password",
)
class ResetPasswordView(GenericAPIView):
    serializer_class = ResetPasswordSerializer
    permission_classes = (AllowAny,)

    @sensitive_variables("password", "token", "serializer.data")
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            token_validator = Sha3PasswordResetTokenGenerator()
            hashids = Hashids(min_length=16)

            password = serializer.data["password"]
            pk = serializer.data["pk"]
            token = serializer.data["token"]

            uid = hashids.decode(pk)[0]
            user = get_user_model().objects.get(pk=uid)

            if token_validator.check_token(user, token):
                password_validation.validate_password(password, user)

                user.set_password(password)
                user.save()

            else:
                return Response(
                    {"result": "error", "message": "This token is invalid or has already been used."},
                    content_type="application/json",
                    status=400,
                )

        except Exception as e:
            return Response({"result": "error", "message": str(e)}, content_type="application/json", status=500)

        return Response({"result": "success", "message": "Password Updated."}, content_type="application/json")


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
                }
            )

        group = Group.objects.filter(pk=group_id).first()
        if group is None:
            return JsonResponse(
                {
                    "state": "erred",
                    "errors": ["Unable to find the group to delete."],
                }
            )

        group_name = group.name
        permission.group_set.remove(group)

        obj_is_used = False
        for field in group._meta.get_fields():
            get_accessor_name_func = getattr(field, "get_accessor_name", None)
            if get_accessor_name_func is not None:
                related_field = getattr(group, get_accessor_name_func(), None)
                if related_field is not None and related_field.exists():
                    obj_is_used = True

        GroupChange.objects.create(
            group_name=group_name,
            change_type=GroupChange.UNASSOCIATED if obj_is_used else GroupChange.DELETED,
            historical_permission_codename=permission.codename,
            historical_permission_content_type_app_label=permission.content_type.app_label,
            historical_permission_content_type_model_name=permission.content_type.model,
        )

        if not obj_is_used:
            group.delete()

        return JsonResponse(
            {
                "state": "succeeded",
                "group_deleted": not obj_is_used,
            }
        )


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
                }
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
                }
            )

        permission = Permission.objects.filter(pk=permission_id).first()
        if permission is None:
            return JsonResponse(
                {
                    "state": "erred",
                    "errors": ["Unable to find the permission for the group you want to change."],
                }
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
                    }
                )

            permission.group_set.add(group)
            GroupChange.objects.create(
                group_name=group_name,
                change_type=GroupChange.ADDED if created else GroupChange.ASSOCIATED,
                historical_permission_codename=permission.codename,
                historical_permission_content_type_app_label=permission.content_type.app_label,
                historical_permission_content_type_model_name=permission.content_type.model,
            )

        else:
            group = Group.objects.filter(pk=group_id).first()
            if group is None:
                return JsonResponse(
                    {
                        "state": "erred",
                        "errors": ["Unable to find the group to change."],
                    }
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
                        }
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
            }
        )
