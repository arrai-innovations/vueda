from http import HTTPStatus

import pytest
import sentry_sdk
from django.contrib.auth.models import Group
from django.urls import path
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.transport import Transport

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


urlpatterns = [
    path("write-then-raise/", WriteThenRaiseView.as_view()),
    path("write-then-gate/", WriteThenGateView.as_view()),
    path("reject-input/", RejectInputView.as_view()),
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
    """The handler leaves validation errors out of Sentry."""

    def test_does_not_send_validation_errors_to_sentry(self, client, settings, sentry_transport):
        settings.DEBUG = False
        settings.IN_TESTS = False

        response = client.post("/reject-input/")

        assert response.status_code == HTTPStatus.BAD_REQUEST
        assert sentry_transport.events == []
