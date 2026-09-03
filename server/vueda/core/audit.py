"""An explicit action context for audited writes that happen outside a request."""

__all__ = ("audited_action",)

import contextlib

import pghistory


@contextlib.contextmanager
def audited_action(action, **metadata):
    """Group every audited write inside this block under one action.

    Request traffic takes its context from history middleware. A management command, a background
    task, or a nested service operation has no request, so it names its own action here. Writes
    outside any context still record events; they just carry no identity associating them with the
    other writes of the same operation.

    Nesting follows pghistory: an inner block adds to the metadata of the outer one and restores it
    on exit.
    """
    with pghistory.context(action=action, **metadata):
        yield
