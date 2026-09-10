"""An explicit action context for audited writes that happen outside a request."""

__all__ = (
    "audited_action",
    "current_action_metadata",
)

import contextlib

import pghistory
from django.db import DatabaseError
from django.db import connection
from pghistory import runtime


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
    action keeps that metadata until it exits. Only the outermost block clears the action when it
    ends, because an inner one leaving must not take the action its caller is still writing under.
    """
    owns_action = getattr(runtime._tracker, "value", None) is None

    with pghistory.context(action=action, **metadata) as current:
        if kind is not None:
            current.metadata["kind"] = kind
        else:
            current.metadata.setdefault("kind", "system")
        try:
            yield
        finally:
            if owns_action:
                _clear_action()


def current_action_metadata():
    """Return the metadata of the action currently open, or an empty mapping outside one.

    History middleware records the acting user on a request's action, so this is where code holding
    no user of its own can find who is acting.

    pghistory keeps the open action in a thread-local and exposes no reader for it. This is the one
    place that reaches for it, and the one place to change if pghistory grows a supported one.
    """
    current = getattr(runtime._tracker, "value", None)
    return getattr(current, "metadata", None) or {}


def _clear_action():
    """Stop attributing writes to the action that just ended.

    pghistory tells the database about an action by setting a transaction-local before each
    statement. It stops setting it once the block exits, but what it set stays for the rest of the
    transaction, so a later write in that transaction would still be recorded under an action that
    is over. Clearing it makes the trigger record no action, which is what a write outside one is.

    A failing block can leave the transaction unable to run this, and the error that got it there
    matters more than the tidy-up.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT set_config('pghistory.context_id', '', true), "
                "set_config('pghistory.context_metadata', '', true);"
            )
    except DatabaseError:
        pass
