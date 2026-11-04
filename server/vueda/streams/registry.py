"""Registration helpers that give a VUEDA model its subscription defaults."""

__all__ = (
    "default_facets_for",
    "register_model",
    "register_viewset",
)

from object_streams import registry as default_registry

from vueda.core.installed_apps import workflow_enabled
from vueda.streams.visibility import VuedaVisibilityPolicy


def default_facets_for(model):
    """
    Return the event facets a subscriber to ``model`` receives.

    Every model gets ``object`` for writes to its own row. A workflow model also gets
    ``workflow_state``, because a transition writes a workflow state row and never the model's own
    row. The capture trigger on that state row labels its events ``workflow_state``.
    """
    if workflow_enabled(model):
        return ("object", "workflow_state")
    return ("object",)


def register_model(model, *, filterset=None, visibility=None, facets=None, registry=None):
    """Register a model for subscriptions, defaulting to VUEDA's own permission rules."""
    return (registry or default_registry).register(
        model,
        filterset=filterset,
        visibility=visibility or VuedaVisibilityPolicy(),
        facets=facets or default_facets_for(model),
    )


def register_viewset(viewset, *, registry=None):
    """
    Register the model a viewset serves, reusing the viewset's own FilterSet.

    The same FilterSet that validates a list request validates a subscription, so a client cannot
    subscribe to a query it could not have asked for over REST. Call this from your
    ``AppConfig.ready()``, beside the model's ``vueda.info.registration.register`` call.

    Registration does not capture changes. Enable capture with ``class Vueda.Streams`` on the model.
    """
    queryset = getattr(viewset, "queryset", None)
    if queryset is None:
        msg = f"{viewset.__name__} has no queryset to register for object streams."
        raise ValueError(msg)
    return register_model(
        queryset.model,
        filterset=getattr(viewset, "filterset_class", None),
        visibility=VuedaVisibilityPolicy(queryset=queryset),
        registry=registry,
    )
