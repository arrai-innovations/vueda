"""
The column totals query parameter in the generated OpenAPI schema.

Nothing else would document it. It is neither a pagination parameter nor a filter backend's, so
drf-spectacular's own ``_get_pagination_parameters`` and ``_get_filter_parameters`` never see it,
and a schema without ``VuedaBaseAutoSchema.get_override_parameters`` would describe a response key
(``columnTotals``) that no documented request could populate.

``preprocessing_hooks`` strips every ``/routes/tests/*`` path from schema generation, so a viewset
routed through the normal test router never reaches ``AutoSchema.get_operation()``. As in
``test_spectacular_exclude_fields``, these tests replace ``PREPROCESSING_HOOKS`` with a synthetic
endpoint list pointing straight at the fixture viewset.
"""

import pytest
from django.conf import settings
from drf_spectacular.generators import SchemaGenerator
from drf_spectacular.settings import spectacular_settings

from tests.store import viewsets as store_viewsets
from vueda.core.open_api import VuedaAutoSchema


def build_operation(monkeypatch, viewset, path="/routes/tests/store/cart_items/", actions=None):
    """The generated GET operation for one synthetic endpoint, with no other path in the schema."""
    callback = viewset.as_view(actions or {"get": "list"})
    endpoint = (path, 'path.lstrip("/")$', "GET", callback)
    monkeypatch.setattr(spectacular_settings, "PREPROCESSING_HOOKS", [lambda endpoints: [endpoint]])

    schema = SchemaGenerator().get_schema(request=None, public=True)
    return schema["paths"][path]["get"]


@pytest.mark.django_db
class TestSpectacularColumnTotalsParameter:
    def test_list_documents_the_declared_totals(self, monkeypatch):
        """`CartItemViewSet` declares two totals, so the schema names those two and the wildcards.

        Enumerating per operation is the point: the schema says what *this* endpoint accepts rather
        than describing the feature in the abstract. `style: form` with `explode: false` is the
        comma-separated spelling the client sends.
        """
        operation = build_operation(monkeypatch, store_viewsets.CartItemViewSet)

        parameter = next(p for p in operation["parameters"] if p["name"] == settings.COLUMN_TOTALS_PARAM)

        assert parameter["in"] == "query"
        assert parameter["style"] == "form"
        assert parameter["explode"] is False
        assert "required" not in parameter
        assert parameter["schema"]["type"] == "array"
        # `build_parameter_type` puts the enum on the items of an array schema and sorts it.
        assert parameter["schema"]["items"] == {
            "type": "string",
            "enum": ["*", "product_price", "quantity", "~all"],
        }
        assert "COLUMN_TOTALS_PARAM" in parameter["description"]

    def test_a_viewset_declaring_no_totals_documents_no_parameter(self, monkeypatch):
        """Documenting it everywhere would offer a parameter whose only usable value is a wildcard
        that returns nothing."""
        operation = build_operation(monkeypatch, store_viewsets.ProductOptionViewSet)

        assert settings.COLUMN_TOTALS_PARAM not in {p["name"] for p in operation["parameters"]}


class TestColumnTotalsOverrideParameter:
    """The hook's own gating, without generating a schema -- no database, no URL conf.

    `retrieve` rejects the parameter at request time (`get_retrieve_allowed_fields` omits it), so
    documenting it there would describe a request that 400s.
    """

    @staticmethod
    def override_parameters(viewset, action, method="GET"):
        schema = VuedaAutoSchema()
        view = viewset()
        view.action = action
        schema.view = view
        schema.method = method
        return schema.get_override_parameters()

    def test_only_the_list_action_is_given_the_parameter(self):
        listed = self.override_parameters(store_viewsets.CartItemViewSet, "list")
        assert [parameter.name for parameter in listed] == [settings.COLUMN_TOTALS_PARAM]
        assert listed[0].enum == ["quantity", "product_price", "~all", "*"]

        for action in ("retrieve", "create", "history_list"):
            assert self.override_parameters(store_viewsets.CartItemViewSet, action) == []

    def test_a_view_without_the_hook_is_left_alone(self):
        """Duck-typed on `get_declared_column_totals`, so a plain DRF view in a project's own URL
        conf is documented exactly as it was."""
        from rest_framework.viewsets import ModelViewSet

        class PlainViewSet(ModelViewSet):
            pass

        assert self.override_parameters(PlainViewSet, "list") == []
