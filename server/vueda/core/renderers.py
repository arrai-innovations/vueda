"""
JSON rendering for VUEDA responses.

DRF's own encoder renders a ``timedelta`` as ``str(obj.total_seconds())`` -- a JSON string, not a
JSON number. That is a reasonable default for a serializer field, whose declared type is a string
either way, but it is wrong for a value that never passes through a serializer field at all. A
``Sum`` over a ``DurationField`` is exactly that: ``get_column_info`` puts the aggregate straight
into the response, so a duration total would reach a client as ``"3600.0"`` where every other total
is a number, and where the paginated response schema promises a number.

So the encoder below renders durations as seconds, and the two renderers exist only to use it. DRF
reads the encoder off the renderer class rather than from a setting, so a project cannot swap it in
through ``REST_FRAMEWORK`` alone.
"""

import datetime

from rest_framework import renderers
from rest_framework.utils import encoders


class VuedaJSONEncoder(encoders.JSONEncoder):
    """
    DRF's JSON encoder, with durations as a number of seconds rather than a string.

    Everything else is inherited. ``super()`` still decides what each type becomes, so a type DRF
    learns to encode later is encoded that way here too; only the ``timedelta`` result is converted,
    and it is parsed back from DRF's own representation rather than recomputed, so the two cannot
    disagree about which unit is meant.
    """

    def default(self, obj):
        representation = super().default(obj)
        if isinstance(obj, datetime.timedelta):
            return float(representation)
        return representation


class VuedaJSONRenderer(renderers.JSONRenderer):
    """DRF's JSON renderer, using :class:`VuedaJSONEncoder`."""

    encoder_class = VuedaJSONEncoder


class VuedaJSONOpenAPIRenderer(renderers.JSONOpenAPIRenderer):
    """
    DRF's JSON OpenAPI renderer, using :class:`VuedaJSONEncoder`.

    It carries its own ``encoder_class`` rather than inheriting the one above, so a schema rendered
    through DRF's own generator encodes durations the same way the responses it describes do.
    """

    encoder_class = VuedaJSONEncoder
