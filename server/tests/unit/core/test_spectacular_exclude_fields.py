"""
Exercises ``manage.py spectacular`` with ExcludeFieldsSerializerMixin used the one valid way (a routed
ViewSet's serializer_class directly) and the two ways it is misused (a nested field, an expandable
field) -- the misuse cases still crash with a bare KeyError: 'view'. ``preprocessing_hooks`` strips every
``/routes/tests/*`` path from schema generation, so a viewset routed through the normal test router
(``tests.urls``) would never reach ``AutoSchema.get_operation()`` at all -- these tests replace
``PREPROCESSING_HOOKS`` with a synthetic endpoint list pointing directly at the erring fixtures instead
of relying on real URL-conf discovery.
"""

import os

import pytest
from drf_spectacular.settings import spectacular_settings

from tests.conftest import BaseTestCallCommand
from tests.erring import viewsets as err_viewsets
from tests.utils import BaseTestMigrations


def _make_endpoint(path, viewset, actions=None):
    """Build a (path, path_regex, method, callback) tuple like drf_spectacular's own endpoint
    enumerator would, e.g. ('/routes/vueda.info/model_info/', 'routes/vueda.info/^model_info/$', 'GET',
    <viewset callback>)."""
    if actions is None:
        actions = {"get": "list"}
    callback = viewset.as_view(actions)
    return path, 'path.lstrip("/")$', "GET", callback


class BaseSpectacularExcludeFieldsTest(BaseTestMigrations, BaseTestCallCommand):
    def generate_schema(self, monkeypatch, schema_path, path, viewset):
        endpoint = _make_endpoint(path, viewset)
        monkeypatch.setattr(spectacular_settings, "PREPROCESSING_HOOKS", [lambda endpoints: [endpoint]])
        return self.call_command("spectacular", "--format", "openapi-json", "--file", schema_path)


@pytest.mark.django_db
class TestSpectacularExcludeFieldsSerializerMixin(BaseSpectacularExcludeFieldsTest):
    def test_registered_with_a_view_generates_schema(self, monkeypatch):
        """ExcludeFieldsSerializer is a routed ViewSet's serializer_class directly -- the only valid use.

        get_schema_fields() re-instantiates self.__class__() to describe this serializer's own fields;
        it passes self.context along (see VuedaExpandableFieldsSerializerMixin.get_schema_fields) so that
        re-instantiation carries the view the properly-registered root already has, instead of being bare.
        """
        with self.temporary_migration_module(app_label="erring") as migration_dir:
            schema_path = os.path.join(os.path.dirname(migration_dir), "schema.json")

            succeeded, results = self.generate_schema(
                monkeypatch, schema_path, "/routes/erring/exclude_fields_valid/", err_viewsets.ExcludeFieldsViewSet
            )

            assert succeeded, results
            assert os.path.exists(schema_path)

    def test_used_as_a_nested_field_raises(self, monkeypatch):
        """ExcludeFieldsAsNestedFieldSerializer nests ExcludeFieldsSerializer as a declared field, like
        store.InvoiceSerializer nests InvoiceLineSerializer. The nested instance is still unbound (no
        parent, so no context) when drf_writable_nested's UniqueFieldsMixin.get_fields() inspects its
        validators, so ExcludeFieldsSerializerMixin.get_extra_kwargs() raises KeyError: 'view'.
        """
        with self.temporary_migration_module(app_label="erring") as migration_dir:
            schema_path = os.path.join(os.path.dirname(migration_dir), "schema.json")

            with pytest.raises(KeyError, match="view"):
                self.generate_schema(
                    monkeypatch,
                    schema_path,
                    "/routes/erring/exclude_fields_as_nested_field/",
                    err_viewsets.ExcludeFieldsAsNestedFieldViewSet,
                )

    def test_used_as_an_expandable_field_raises(self, monkeypatch):
        """ExcludeFieldsAsExpandableFieldSerializer only reaches ExcludeFieldsSerializer through
        expandable_fields, like store.CustomerSerializer expanding UserSerializer.
        generate_expand_model_info() instantiates the expand target bare (no context) to build its
        /info/-style field metadata, so ExcludeFieldsSerializerMixin.get_extra_kwargs() raises
        KeyError: 'view'.
        """
        with self.temporary_migration_module(app_label="erring") as migration_dir:
            schema_path = os.path.join(os.path.dirname(migration_dir), "schema.json")

            with pytest.raises(KeyError, match="view"):
                self.generate_schema(
                    monkeypatch,
                    schema_path,
                    "/routes/erring/exclude_fields_as_expandable_field/",
                    err_viewsets.ExcludeFieldsAsExpandableFieldViewSet,
                )
