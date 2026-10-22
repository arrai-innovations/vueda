"""Events that belong to an object's history without a foreign key to the object.

pghistory finds an object's events through foreign keys: the object's own event table, and every
event table with a foreign key to the object's model. A record that names its object some other
way, as workflow's ``ObjectState`` does with a workflow and a plain integer id, is invisible to that
lookup. The app that owns such a record registers a resolver here, so ``vueda.history`` can include
the record's events without importing that app.
"""

__all__ = (
    "register_state_events",
    "state_events_for",
)


#: Each resolver takes an object and returns its workflow state events, or ``None`` when it has none.
_STATE_EVENT_RESOLVERS = []


def register_state_events(resolver):
    """Register a resolver that names an object's workflow state events.

    ``resolver(instance)`` returns a ``pghistory.models.Events`` queryset of the object's state
    changes, or ``None`` when the object has no state events. History publishes the events it
    returns with ``relation: "state"``.
    """
    if resolver not in _STATE_EVENT_RESOLVERS:
        _STATE_EVENT_RESOLVERS.append(resolver)


def state_events_for(instance):
    """Return the state event querysets that every registered resolver names for ``instance``."""
    resolved = (resolver(instance) for resolver in _STATE_EVENT_RESOLVERS)
    return tuple(events for events in resolved if events is not None)
