"""DRF ViewSet for managing user TOTP authentication devices."""

__all__ = ("TOTPDeviceViewSet",)

import base64
from types import SimpleNamespace

from allauth.account.internal.flows.login import record_authentication
from allauth.mfa.adapter import get_adapter
from allauth.mfa.models import Authenticator
from allauth.mfa.totp.internal import auth as totp_auth
from allauth.mfa.totp.internal import flows as totp_flows
from allauth.mfa.utils import encrypt
from django.db.transaction import atomic
from rest_framework import serializers
from rest_framework import status as drf_status
from rest_framework.mixins import DestroyModelMixin
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet

from vueda.core.decorators import DRY_RUN_HEADER
from vueda.core.decorators import action
from vueda.core.decorators import recent_auth_required
from vueda.core.exceptions import VuedaValidationError
from vueda.core.open_api import conditional_extend_schema_decorator
from vueda.core.open_api import conditional_inline_serializer
from vueda.core.open_api import conditional_open_api_types
from vueda.core.serializers import PrimaryKeyListSerializer
from vueda.core.viewsets import VuedaViewSet
from vueda.user.adapters import get_adapter as vueda_get_adapter
from vueda.user.filtersets import TOTPDeviceFilterSet
from vueda.user.models import TOTPDevice
from vueda.user.schema import RateLimitedSerializer
from vueda.user.serializers import TOTPDeviceSerializer
from vueda.user.serializers import TOTPSetupSerializer
from vueda.user.throttles import throttle_code_send
from vueda.user.utils import get_current_totp_code


class TOTPDeviceViewSet(ReadOnlyModelViewSet, DestroyModelMixin):
    """
    List, set up, activate, and remove the signed-in user's two-factor devices.

    All of a user's devices share one allauth TOTP ``Authenticator`` and its secret. Sign-in codes for email and
    SMS are computed from the stored secret when they are sent, so the authenticator app is the only device that
    holds a copy of the secret. Adding or removing the app therefore gives the authenticator a new secret, which
    leaves the email and SMS devices working and stops any earlier copy of the app from producing valid codes.
    """

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

    def _get_authenticator_with_lock(self):
        return (
            Authenticator.objects.select_for_update()
            .filter(type=Authenticator.Type.TOTP, user=self.request.user)
            .first()
        )

    @staticmethod
    def _replace_secret(authenticator, secret):
        authenticator.data["secret"] = encrypt(secret)
        authenticator.save(update_fields=["data"])

    @conditional_extend_schema_decorator(
        summary="Set up TOTP device",
        responses={
            200: conditional_open_api_types().OBJECT,
            400: conditional_open_api_types().OBJECT,
            429: RateLimitedSerializer,
        },
    )
    @atomic
    @recent_auth_required
    @action(detail=False, methods=["post"])
    def setup(self, request):
        """
        Start setting up a two-factor device with the requested ``method``.

        Each setup generates a new setup secret and keeps it in the session. For ``totp`` (an authenticator app),
        returns that secret and its QR code. For ``email`` and ``sms``, sends a code from that secret to
        ``destination``, so the code proves that the user receives messages there and does not confirm sign-in.
        The device is added when ``activate`` confirms the code.
        """
        authenticator = self._get_authenticator_with_lock()
        method = request.data.get("method")
        serializer = TOTPSetupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if method not in serializer.fields["method"].choices:
            if method == "sms":
                raise VuedaValidationError({"method": ["SMS method is not available."]})
            raise VuedaValidationError({"method": ["Invalid method"]})

        if (
            authenticator
            and TOTPDevice.objects.filter(authenticator=authenticator, user=request.user, method=method).exists()
        ):
            raise VuedaValidationError({"method": ["An activated TOTP device already exists with " + method]})
        secret = totp_auth.get_totp_secret(regenerate=True)

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
            throttle_code_send(request, request.user, method, destination=phone)

            request.session[self.TOTP_SESSION_KEY] = {"method": method, "sms": phone}
            context = {
                "code": get_current_totp_code(secret),
            }
            vueda_get_adapter().send_sms(phone, request.user.name, "totp_code", context)

        elif method == "email":
            email = request.data.get("destination")
            throttle_code_send(request, request.user, method, destination=email)
            request.session[self.TOTP_SESSION_KEY] = {"method": method, "email": email}
            context = {
                "code": get_current_totp_code(secret),
            }
            vueda_get_adapter().send_mail(email, request.user.name, "totp_code", context)

        return Response(status=drf_status.HTTP_200_OK)

    @conditional_extend_schema_decorator(
        summary="Activate TOTP device",
        responses={
            201: conditional_inline_serializer(
                "TOTPActivateResponse",
                fields={"detail": serializers.CharField()},
            ),
            400: conditional_open_api_types().OBJECT,
        },
    )
    @atomic
    @recent_auth_required
    @action(detail=False, methods=["post"])
    def activate(self, request):
        """
        Confirm the ``code`` for the device that ``setup`` started, and add the device.

        The code is checked against the setup secret. The first device creates the user's TOTP authenticator with
        that secret. An authenticator app added to an existing authenticator replaces its secret with the setup
        secret. An email or SMS device joins the existing authenticator and leaves its secret unchanged.
        """
        authenticator = self._get_authenticator_with_lock()
        code = request.data.get("code")
        if not code:
            return Response({"detail": "Code is required"}, status=drf_status.HTTP_400_BAD_REQUEST)
        meta_data = request.session.get(self.TOTP_SESSION_KEY)
        if meta_data is None:
            raise VuedaValidationError(["No TOTP setup in progress"])
        device_type = meta_data.get("method")
        if (
            authenticator
            and TOTPDevice.objects.filter(authenticator=authenticator, user=request.user, method=device_type).exists()
        ):
            raise VuedaValidationError({"method": ["An activated TOTP device already exists with " + device_type]})

        secret = totp_auth.get_totp_secret(regenerate=False)
        if not totp_auth.validate_totp_code(secret, code):
            raise VuedaValidationError({"code": ["Invalid code"]})
        if not authenticator:
            authenticator = totp_flows.activate_totp(request, SimpleNamespace(secret=secret))[0]
        elif device_type == "totp":
            self._replace_secret(authenticator, secret)
        totp_auth.clear_totp_secret(request)
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
        # The code just validated proves possession of the authenticator, so it counts as a second-factor
        # authentication. Without this record the first activation would leave the session stale at once,
        # since the account now requires a second factor and has only confirmed a password.
        record_authentication(
            request, request.user, "mfa", id=authenticator.pk, type=authenticator.type, reauthenticated=True
        )
        return Response({"detail": "TOTP setup complete"}, status=drf_status.HTTP_201_CREATED)

    @conditional_extend_schema_decorator(
        summary="Delete TOTP device",
        responses={204: None},
    )
    @atomic
    @recent_auth_required
    def destroy(self, request, *args, **kwargs):
        """
        Remove one device by ``pk``, or several by ``pks`` in the request body.

        Removing the last device turns two-factor authentication off. Removing the authenticator app while other
        devices remain gives the authenticator a new secret, so the removed app's codes stop working.
        """
        dry_run = request.headers.get(DRY_RUN_HEADER, "false").lower() == "true"
        pk = kwargs.get("pk")
        serializer_data = {"pks": [pk]} if pk else request.data
        serializer = PrimaryKeyListSerializer(data=serializer_data)
        serializer.is_valid(raise_exception=True)
        pks = serializer.validated_data["pks"]
        if not dry_run:
            authenticator = self._get_authenticator_with_lock()
            removed = self.get_queryset().filter(pk__in=pks)
            removes_app = removed.filter(method="totp").exists()
            removed.delete()
            if authenticator and not self.get_queryset().exists():
                totp_flows.deactivate_totp(request, authenticator)
            elif authenticator and removes_app:
                self._replace_secret(authenticator, totp_auth.generate_totp_secret())

        return Response(status=drf_status.HTTP_204_NO_CONTENT)
