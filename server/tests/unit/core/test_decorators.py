from unittest.mock import patch

import pytest
from django.db import transaction
from django.urls import reverse
from rest_framework import status

from tests.store.models import Distributor
from tests.store.viewsets import CartViewSet


pytestmark = pytest.mark.urls("tests.store.routers")


@pytest.mark.django_db
class TestActionDecoratorDryRun:
    def test_marks_actions_as_bulk(self):
        assert CartViewSet.dry_run_outer.bulk is True
        assert CartViewSet.dry_run_inner.bulk is True

    def test_nested_calls_only_set_rollback_once(self, api_client):
        with patch("vueda.core.decorators.transaction.set_rollback", wraps=transaction.set_rollback) as set_rollback:
            with transaction.atomic():
                response = api_client.post(reverse("store.cart-dry-run-outer"), HTTP_DRY_RUN="true")

        assert response.status_code == status.HTTP_200_OK, response.data
        set_rollback.assert_called_once_with(True)
        assert not Distributor.objects.filter(name="Dry Run").exists()

    def test_propagates_errors_without_committing(self, api_client):
        with transaction.atomic():
            response = api_client.post(reverse("store.cart-dry-run-outer"), HTTP_DRY_RUN="true", data={"fail": True})

        assert response.status_code == status.HTTP_400_BAD_REQUEST, response.data
        assert not Distributor.objects.filter(name="Dry Run").exists()
