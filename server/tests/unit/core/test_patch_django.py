from django.contrib import auth
from django.test import override_settings

from tests.store.models import CustomerData
from tests.store.models import Distributor
from vueda.core.patch_django import get_builtin_permissions


def test_get_permission_codename_reads_permission_names_mapping_at_call_time():
    # get_permission_codename previously closed over PERMISSION_NAMES_MAPPING at import,
    # so overriding the setting changed what settings.PERMISSION_NAMES_MAPPING reported without
    # reaching this function. Reintroducing that binding makes the middle assertion fail.
    assert auth.get_permission_codename("add", Distributor._meta) == "create_distributor"

    with override_settings(PERMISSION_NAMES_MAPPING={"add": "mutated"}):
        assert auth.get_permission_codename("add", Distributor._meta) == "mutated_distributor"

    assert auth.get_permission_codename("add", Distributor._meta) == "create_distributor"


def test_get_builtin_permissions_reads_permission_names_mapping_at_call_time():
    # CustomerData is a plain Django model, so its default_permissions still carries Django's
    # "add"/"view"/"change" action names for get_builtin_permissions to map. VuedaModel
    # subclasses (like Distributor) declare default_permissions as the mapped CRUD names
    # directly in their Meta, which makes the mapping a no-op for them.
    assert "add" in CustomerData._meta.default_permissions

    with override_settings(PERMISSION_NAMES_MAPPING={"add": "mutated", "view": "read", "change": "update"}):
        codenames = [codename for codename, _ in get_builtin_permissions(CustomerData._meta)]

    assert "mutated_customerdata" in codenames
    assert "create_customerdata" not in codenames
