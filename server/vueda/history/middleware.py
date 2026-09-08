"""Request middleware that names the user action behind each history event."""

__all__ = ("VuedaHistoryMiddleware",)

from pghistory.middleware import HistoryMiddleware


class VuedaHistoryMiddleware(HistoryMiddleware):
    """Record stable request metadata on the pghistory context.

    pghistory's own middleware records the acting user and the request path. VUEDA adds the request
    method, which is what separates a create from an update or a delete when one action writes to
    several tables, and the action kind ``request``, which separates a request from a task or a
    command once the events are read back.

    This decides what VUEDA records, not what the history API exposes.
    """

    def get_context(self, request):
        return {**super().get_context(request), "method": request.method, "kind": "request"}
