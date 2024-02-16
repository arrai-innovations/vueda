import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth import password_validation
from django.contrib.auth.forms import _unicode_ci_compare
from django.contrib.auth.models import AnonymousUser
from django.views.decorators.debug import sensitive_variables
from django.views.generic.detail import SingleObjectMixin
from hashids import Hashids
from rest_framework.generics import GenericAPIView
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from vueda.core.permissions import VUEDAObjectPermissions
from vueda.core.serializers import ForgotPasswordSerializer
from vueda.core.serializers import ResetPasswordSerializer
from vueda.core.serializers import WhoAmISerializer
from vueda.core.tokens import Sha3PasswordResetTokenGenerator


User = get_user_model()


class WhoAmIView(RetrieveAPIView):
    serializer_class = WhoAmISerializer
    permission_classes = []

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if isinstance(instance, AnonymousUser):
            return Response({}, status=200)
        return super().retrieve(request, *args, **kwargs)

    def get_object(self):
        if self.request.user.pk:
            return get_user_model()
        return self.request.user


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


class ResendWelcomeEmailView(SingleObjectMixin, APIView):
    permission_classes = (IsAuthenticated, VUEDAObjectPermissions)
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
