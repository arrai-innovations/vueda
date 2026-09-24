"""VUEDA's JSON renderers, and the duration encoding they exist for."""

import json
from datetime import datetime
from datetime import timedelta
from datetime import timezone
from decimal import Decimal

from rest_framework.renderers import JSONRenderer
from rest_framework.utils.encoders import JSONEncoder

from tests.store.models import CartItem
from tests.timesheet.models import TimesheetEntry
from vueda.core.renderers import VuedaJSONEncoder
from vueda.core.renderers import VuedaJSONOpenAPIRenderer
from vueda.core.renderers import VuedaJSONRenderer
from vueda.core.viewsets import _column_total_zero


class TestVuedaJSONEncoder:
    def test_timedelta_is_a_number(self):
        rendered = json.loads(json.dumps({"delivery_time": timedelta(hours=1)}, cls=VuedaJSONEncoder))

        assert rendered == {"delivery_time": 3600.0}
        assert isinstance(rendered["delivery_time"], float)

    def test_drf_renders_the_same_duration_as_a_string(self):
        """The reason the subclass exists, asserted rather than described.

        A `Sum` over a `DurationField` reaches the response as a `timedelta` without passing through
        a serializer field, so DRF's string is what a client would receive for a column total that
        the paginated response schema promises as a number.
        """
        rendered = json.loads(json.dumps({"delivery_time": timedelta(hours=1)}, cls=JSONEncoder))

        assert rendered == {"delivery_time": "3600.0"}

    def test_sub_second_and_negative_durations_keep_their_value(self):
        rendered = json.loads(
            json.dumps({"tiny": timedelta(milliseconds=1500), "owed": timedelta(minutes=-2)}, cls=VuedaJSONEncoder)
        )

        assert rendered == {"tiny": 1.5, "owed": -120.0}

    def test_other_types_are_left_to_drf(self):
        """Only the duration is converted; everything else is whatever DRF already decided."""
        payload = {
            "when": datetime(2026, 9, 16, 12, 30, tzinfo=timezone.utc),
            "amount": Decimal("3.15"),
        }

        ours = json.dumps(payload, cls=VuedaJSONEncoder)
        drfs = json.dumps(payload, cls=JSONEncoder)

        assert ours == drfs


class TestVuedaRenderers:
    def test_renderer_uses_the_vueda_encoder(self):
        content = VuedaJSONRenderer().render({"columnTotals": {"delivery_time": timedelta(hours=1)}})

        assert json.loads(content) == {"columnTotals": {"delivery_time": 3600.0}}

    def test_stock_renderer_would_not(self):
        content = JSONRenderer().render({"columnTotals": {"delivery_time": timedelta(hours=1)}})

        assert json.loads(content) == {"columnTotals": {"delivery_time": "3600.0"}}

    def test_open_api_renderer_uses_the_vueda_encoder(self):
        content = VuedaJSONOpenAPIRenderer().render({"example": timedelta(seconds=90)})

        assert json.loads(content) == {"example": 90.0}

    def test_renderers_are_drf_renderers(self):
        """Subclasses rather than replacements, so media type, charset, and the rest still apply."""
        assert VuedaJSONRenderer.media_type == JSONRenderer.media_type
        assert issubclass(VuedaJSONRenderer, JSONRenderer)
        assert VuedaJSONEncoder is VuedaJSONRenderer.encoder_class
        assert VuedaJSONEncoder is VuedaJSONOpenAPIRenderer.encoder_class


class TestColumnTotalZero:
    """The zero a total falls back to has to be the type being summed.

    Django hands an aggregate's `default` to `Value(default, <the aggregate's output field>)`, so a
    numeric zero on a `DurationField` total would be adapted as an interval. These do not query;
    resolving the column is `_meta` walking.
    """

    def test_a_numeric_column_totals_down_to_a_number(self):
        assert _column_total_zero(TimesheetEntry, "hours") == 0

    def test_a_duration_column_totals_down_to_a_zero_duration(self):
        assert _column_total_zero(CartItem, "cart__expected_delivery_time") == timedelta(0)

    def test_an_unresolvable_path_falls_back_rather_than_raising(self):
        """`aggregate()` raises `FieldError` for it on the same call, and `vueda_info.E011` reports
        it at check time, so the value here is never used -- but working it out must not be the
        thing that fails."""
        assert _column_total_zero(TimesheetEntry, "no_such_column") == 0


class TestRendererIsConfigured:
    def test_default_renderer_classes_uses_ours(self, settings):
        """The encoder only reaches a response through the configured renderer, so the wiring is
        part of the fix rather than a project's own concern."""
        assert settings.REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] == ["vueda.core.renderers.VuedaJSONRenderer"]
