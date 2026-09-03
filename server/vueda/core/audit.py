"""An explicit action context for audited writes that happen outside a request."""

__all__ = ("audited_action",)

import contextlib

import pghistory


@contextlib.contextmanager
def audited_action(action, kind=None, **metadata):
    """Group every audited write inside this block under one action.

    Request traffic takes its context from history middleware. A management command, a background
    task, or a nested service operation has no request, so it names its own action here. Writes
    outside any context still record events; they just carry no identity associating them with the
    other writes of the same operation.

    ``kind`` says what sort of source the action came from. The middleware records ``request``,
    VDQ tasks record ``task``, and a management command should pass ``command``. A block that names
    no kind keeps the kind of the action it runs inside, so a service operation called from a request
    stays a request action; at the top level it defaults to ``system``. The history API publishes the
    kind, so a project that adds one should expect clients to render it as an unrecognized value.

    Nesting follows pghistory: an inner block adds its metadata to the outer action, and the outer
    action keeps that metadata until it exits.
    """
    with pghistory.context(action=action, **metadata) as current:
        if kind is not None:
            current.metadata["kind"] = kind
        else:
            current.metadata.setdefault("kind", "system")
        yield
