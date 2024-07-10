import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth import password_validation
from django.contrib.auth.forms import _unicode_ci_compare
from django.contrib.auth.mixins import PermissionRequiredMixin
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import Case
from django.db.models import F
from django.db.models import OuterRef
from django.db.models import Value
from django.db.models import When
from django.db.models.functions import StrIndex
from django.db.models.functions import Substr
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

from vueda.core.open_api import conditional_extend_schema_decorator
from vueda.core.permissions import ObjectPermissions
from vueda.core.tokens import Sha3PasswordResetTokenGenerator
from vueda.user.mixins import LogoutMixin
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
            groups=ArrayAgg("group__name"),
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

            permission_lists[(app_label, model_name)].append(
                {
                    "pk": pk,
                    "codename": codename,
                    "name": name,
                    "groups": sorted(group for group in groups if group is not None),
                }
            )

        return context
