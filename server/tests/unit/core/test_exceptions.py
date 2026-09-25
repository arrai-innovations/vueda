from http import HTTPStatus

import pytest
from django.contrib.auth.models import Group
from django.urls import path
from rest_framework.response import Response
from rest_framework.views import APIView

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


urlpatterns = [
    path("write-then-raise/", WriteThenRaiseView.as_view()),
    path("write-then-gate/", WriteThenGateView.as_view()),
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
