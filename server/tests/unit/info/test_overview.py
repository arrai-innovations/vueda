import pytest
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.test import RequestFactory

from tests.conftest import BaseTestGroupMixin
from tests.conftest import BaseTestUserMixin
from tests.store import models as store_models
from tests.store import serializers as store_serializers
from tests.store import viewsets as store_viewsets
from vueda import info
from vueda.info.views import InfoOverviewView


@pytest.mark.django_db
class TestInfoOverviewPermissionOrder(BaseTestUserMixin, BaseTestGroupMixin):
    """
    The overview lists each model's permissions in CRUDL order, then the remaining permissions by
    codename. The extra permissions are created out of codename order, so the test fails if the
    remaining permissions come back in database order.
    """

    groups_to_create = {}

    users_to_create = {
        "overview_viewer@domain.invalid": {
            "name": "Overview Viewer",
            "password": "testpass",
            "groups": [],
        },
    }

    @pytest.fixture(autouse=True)
    def registry(self):
        info.registration.get_empty_registry()
        info.register(store_serializers.DistributorSerializer, store_viewsets.DistributorViewSet)
        yield
        info.registration.get_empty_registry()

    def test_remaining_permissions_follow_crudl_in_codename_order(self, monkeypatch):
        # The logout form reverses a URL that only some URLconfs define; permission order does not depend on it.
        monkeypatch.setattr("vueda.user.mixins.render_to_string", lambda *args, **kwargs: "")
        content_type = ContentType.objects.get_for_model(store_models.Distributor)
        for codename in ("zeta_distributor", "alpha_distributor", "mid_distributor"):
            Permission.objects.create(codename=codename, name=codename, content_type=content_type)

        request = RequestFactory().get("/")
        request.user = self.users["overview_viewer@domain.invalid"]
        view = InfoOverviewView()
        view.setup(request)
        context = view.get_context_data()

        (distributor,) = [model for model in context["apps"]["store"] if model["model_name"] == "distributor"]
        codenames = [permission["codename"] for permission in distributor["permissions"]]

        assert codenames[:5] == [
            "create_distributor",
            "read_distributor",
            "update_distributor",
            "delete_distributor",
            "list_distributor",
        ]
        assert codenames[5:] == sorted(codenames[5:])
        assert {"alpha_distributor", "mid_distributor", "zeta_distributor"} <= set(codenames[5:])
