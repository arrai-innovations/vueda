import base64
from types import SimpleNamespace

from allauth.core.exceptions import ReauthenticationRequired
from allauth.mfa.adapter import get_adapter
from allauth.mfa.models import Authenticator
from allauth.mfa.totp.internal import auth as totp_auth
from allauth.mfa.totp.internal import flows as totp_flows
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from rest_framework import status as drf_status
from rest_framework.mixins import DestroyModelMixin
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet

from vueda.core.decorators import action
from vueda.core.exceptions import VuedaValidationError
from vueda.core.viewsets import VuedaViewSet
from vueda.user.filtersets import TOTPDeviceFilterSet
from vueda.user.models import TOTPDevice
from vueda.user.serializers import TOTPDeviceSerializer
from vueda.user.utils import get_current_totp_code


class TOTPDeviceViewSet(ReadOnlyModelViewSet, DestroyModelMixin):
    permission_classes = [IsAuthenticated]
    serializer_class = TOTPDeviceSerializer
    queryset = TOTPDevice.objects.all()
    filterset_class = TOTPDeviceFilterSet
    TOTP_SESSION_KEY = "mfa_totp_meta_data"
    detail_args = VuedaViewSet.detail_args

    def get_queryset(self):
        if hasattr(self, "request") and getattr(self.request, "user", None):
            return TOTPDevice.objects.filter(user_id=self.request.user.id)
        return TOTPDevice.objects.none()

    def _get_authenticator(self):
        return Authenticator.objects.filter(type=Authenticator.Type.TOTP, user=self.request.user).first()

    @action(detail=False, methods=["post"])
    def setup(self, request):
        authenticator = self._get_authenticator()
        method = request.data.get("method")
        if method in ["totp", "email", "sms"]:
            secret = totp_auth.get_totp_secret(regenerate=not authenticator)
        else:
            raise VuedaValidationError({"method": ["Invalid method"]})
        if (
            authenticator
            and TOTPDevice.objects.filter(authenticator=authenticator, user=request.user, method=method).exists()
        ):
            raise VuedaValidationError({"method": ["An activated TOTP device already exists with " + method]})

        if method == "totp":
            request.session[self.TOTP_SESSION_KEY] = {
                "method": method,
            }
            adapter = get_adapter()
            totp_url: str = adapter.build_totp_url(request.user, secret)
            totp_svg = adapter.build_totp_svg(totp_url)
            base64_data = base64.b64encode(totp_svg.encode("utf8")).decode("utf-8")
            totp_data_uri = f"data:image/svg+xml;base64,{base64_data}"
            return Response(
                {
                    "meta": {
                        "totp_secret": secret,
                        "totp_svg_data_uri": totp_data_uri,
                    }
                },
                status=drf_status.HTTP_200_OK,
            )
        elif method == "sms":
            phone = request.data.get("destination")
            if not phone:
                raise VuedaValidationError({"destination": ["Phone number is required for sms method"]})

            request.session[self.TOTP_SESSION_KEY] = {"method": method, "sms": phone}
            # TODO: integrate with vdq .

        elif method == "email":
            email = request.data.get("destination")
            if not email:
                raise VuedaValidationError({"destination": ["An Email address is required for email method"]})
            request.session[self.TOTP_SESSION_KEY] = {"method": method, "email": email}
            send_mail(
                "TOTP Code for Two Factor Authentication Setup",
                f"Your TOTP code is:{get_current_totp_code(secret)}",
                settings.NO_REPLY_EMAIL,
                [email],
                fail_silently=False,
            )

        return Response(status=drf_status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def activate(self, request):
        code = request.data.get("code")
        if not code:
            return Response({"detail": "Code is required"}, status=drf_status.HTTP_400_BAD_REQUEST)
        meta_data = request.session.get(self.TOTP_SESSION_KEY)
        if meta_data is None:
            raise VuedaValidationError(["No TOTP setup in progress"])
        device_type = meta_data.get("method")
        authenticator = self._get_authenticator()
        if (
            authenticator
            and TOTPDevice.objects.filter(authenticator=authenticator, user=request.user, method=device_type).exists()
        ):
            raise VuedaValidationError({"method": ["An activated TOTP device already exists with " + device_type]})

        secret = totp_auth.get_totp_secret(regenerate=False)
        if not totp_auth.validate_totp_code(secret, code):
            raise VuedaValidationError({"code": ["Invalid code"]})
        try:
            form_data = {"secret": secret}
            form = SimpleNamespace(**form_data)
            with transaction.atomic():
                if not authenticator:
                    authenticator = totp_flows.activate_totp(request, form)[0]
                if device_type == "email":
                    TOTPDevice.objects.create(
                        authenticator=authenticator,
                        method=meta_data.get("method"),
                        email=meta_data.get("email"),
                        user=request.user,
                    )
                elif device_type == "sms":
                    TOTPDevice.objects.create(
                        authenticator=authenticator,
                        method=meta_data.get("method"),
                        phone_number=meta_data.get("sms"),
                        user=request.user,
                    )
                else:
                    TOTPDevice.objects.create(authenticator=authenticator, method=device_type, user=request.user)
                return Response({"detail": "TOTP setup complete"}, status=drf_status.HTTP_201_CREATED)
        except ReauthenticationRequired:
            return Response({"detail": "Reauthentication required"}, status=drf_status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({"detail": str(e)}, status=drf_status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        pks = [pk]
        if not pk:
            pks = request.data.get("pks", [])
        with transaction.atomic():
            queryset = self.get_queryset().filter(pk__in=pks)
            count = self.get_queryset().count()
            queryset.delete()
            if count == len(pks):
                Authenticator.objects.filter(user=request.user).delete()

        return Response(status=drf_status.HTTP_204_NO_CONTENT)
