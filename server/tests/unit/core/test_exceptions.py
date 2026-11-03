from http import HTTPStatus

import pytest
import sentry_sdk
from asgiref.sync import async_to_sync
from django.contrib.auth.models import Group
from django.core.exceptions import ImproperlyConfigured
from django.test import AsyncClient
from django.test import Client
from django.urls import path
from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.transport import Transport

from vueda.core.exceptions import ConfirmationRequired
from vueda.core.exceptions import gate_warnings


class WriteThenRaiseView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        Group.objects.create(name="written-before-error")
        raise RuntimeError("failure after a write")


class WriteThenGateView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        Group.objects.create(name="written-before-gate")
        gate_warnings(request, {"non_field_errors": ["Are you sure?"]})
        return Response(status=HTTPStatus.CREATED)


class RejectInputView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        raise ValidationError({"name": ["This field is invalid."]})


def raising_view(build_exception):
    """Return a DRF view whose ``get`` raises the exception that ``build_exception`` returns."""

    class RaisingView(APIView):
        authentication_classes = []
        permission_classes = []

        def get(self, request):
            raise build_exception()

    return RaisingView.as_view()


urlpatterns = [
    path("write-then-raise/", WriteThenRaiseView.as_view()),
    path("write-then-gate/", WriteThenGateView.as_view()),
    path("reject-input/", RejectInputView.as_view()),
    path("raise-runtime-error/", raising_view(lambda: RuntimeError("view failure"))),
    path("raise-improperly-configured/", raising_view(lambda: ImproperlyConfigured("bad configuration"))),
    path("raise-permission-denied/", raising_view(PermissionDenied)),
    path(
        "raise-confirmation-required/",
        raising_view(lambda: ConfirmationRequired({"non_field_errors": ["Are you sure?"]}, "digest")),
    ),
]


@pytest.mark.django_db
@pytest.mark.urls(__name__)
class TestExceptionHandlerRollback:
    """Every response the exception handler builds rolls back the request's atomic block."""

    def test_unhandled_exception_rolls_back_the_write(self, client):
        response = client.post("/write-then-raise/")

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
        assert not Group.objects.filter(name="written-before-error").exists()

    def test_confirmation_required_rolls_back_the_write(self, client):
        response = client.post("/write-then-gate/")

        assert response.status_code == HTTPStatus.CONFLICT
        assert not Group.objects.filter(name="written-before-gate").exists()


class RecordingTransport(Transport):
    """Keeps every envelope that the Sentry client sends, instead of sending it over the network."""

    def __init__(self, options=None):
        super().__init__(options)
        self.envelopes = []

    def capture_envelope(self, envelope):
        self.envelopes.append(envelope)

    @property
    def events(self):
        return [envelope.get_event() for envelope in self.envelopes if envelope.get_event() is not None]


@pytest.fixture
def sentry_transport():
    """
    Initialize Sentry as a deployed project does, and return the transport that records what it sends.

    The client uses ``DjangoIntegration`` and the default integrations, so events from every path count:
    direct captures, Django's request signals, and ``ERROR`` log records. Teardown restores the previous
    client so later tests run without this one.
    """
    previous_client = sentry_sdk.get_client()
    transport = RecordingTransport()
    sentry_sdk.init(
        dsn="https://public@sentry.example.com/1",
        integrations=[DjangoIntegration()],
        transport=transport,
    )
    client = sentry_sdk.get_client()
    yield transport
    client.close()
    sentry_sdk.get_global_scope().set_client(previous_client)


@pytest.mark.django_db
@pytest.mark.urls(__name__)
class TestExceptionHandlerSentry:
    """The handler sends each 500 to Sentry once and leaves 4xx responses out."""

    @pytest.fixture(autouse=True)
    def deployed_settings(self, settings):
        settings.DEBUG = False
        settings.IN_TESTS = False

    @staticmethod
    def exception_of(event):
        return event["exception"]["values"][-1]

    def test_sends_a_runtime_error_to_sentry_once(self, sentry_transport):
        response = Client(raise_request_exception=False).get("/raise-runtime-error/")

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
        assert response.json()["detail"] == "Internal server error."
        [event] = sentry_transport.events
        assert event["transaction"] == "/raise-runtime-error/"
        assert self.exception_of(event)["type"] == "RuntimeError"
        assert self.exception_of(event)["mechanism"] == {"type": "django", "handled": False}

    def test_sends_a_runtime_error_to_sentry_once_under_asgi(self, sentry_transport):
        response = async_to_sync(AsyncClient(raise_request_exception=False).get)("/raise-runtime-error/")

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
        [event] = sentry_transport.events
        assert event["transaction"] == "/raise-runtime-error/"
        assert self.exception_of(event)["type"] == "RuntimeError"

    def test_sends_an_improperly_configured_error_to_sentry_once(self, sentry_transport):
        response = Client(raise_request_exception=False).get("/raise-improperly-configured/")

        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
        assert response.json()["detail"] == ["bad configuration"]
        [event] = sentry_transport.events
        assert self.exception_of(event)["type"] == "ImproperlyConfigured"

    @pytest.mark.parametrize(
        ("url", "status"),
        [
            ("/raise-permission-denied/", HTTPStatus.FORBIDDEN),
            ("/raise-confirmation-required/", HTTPStatus.CONFLICT),
        ],
        ids=["permission-denied", "confirmation-required"],
    )
    def test_does_not_send_4xx_responses_to_sentry(self, client, sentry_transport, url, status):
        response = client.get(url)

        assert response.status_code == status
        assert sentry_transport.events == []

    def test_does_not_send_validation_errors_to_sentry(self, client, sentry_transport):
        response = client.post("/reject-input/")

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert sentry_transport.events == []
