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


def register_viewset(viewset, *, queryset=None, registry=None):
    """
    Register the model a viewset serves, reusing the viewset's FilterSet and its ``get_queryset()``.

    The same FilterSet that validates a list request validates a subscription, so a client cannot
    subscribe to a query it could not have asked for over REST. A subscription starts from the rows
    that the viewset's ``get_queryset()`` returns for the subscriber, so scoping that the viewset
    applies there also applies to subscriptions. ``get_queryset()`` runs with a GET request for the
    subscriber, no query parameters, no URL keyword arguments, and no action.

    Pass ``queryset`` when ``get_queryset()`` cannot run that way, or to start from other rows. It
    replaces ``get_queryset()``, so it must repeat any scoping that ``get_queryset()`` applies.

    ``registry`` defaults to the library's default registry. The call raises ``ValueError`` when
    neither ``queryset`` nor the viewset's ``queryset`` attribute names the model.

    Call this from your ``AppConfig.ready()``, beside the model's ``vueda.info.registration.register``
    call. Registration does not capture changes. Enable capture with ``class Vueda.Streams`` on the
    model.
    """
    model_queryset = queryset if queryset is not None else getattr(viewset, "queryset", None)
    if model_queryset is None:
        msg = f"{viewset.__name__} has no queryset attribute. Pass queryset= to register it for object streams."
        raise ValueError(msg)
    if queryset is not None:
        visibility = VuedaVisibilityPolicy(queryset=queryset)
    else:
        visibility = VuedaVisibilityPolicy(viewset=viewset)
    return register_model(
        model_queryset.model,
        filterset=getattr(viewset, "filterset_class", None),
        visibility=visibility,
        registry=registry,
    )
