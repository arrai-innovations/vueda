"""DRF routers with app-namespaced routes, bulk actions, and content type lookups."""

__all__ = (
    "ContentTypeChoicesRouter",
    "ContentTypeRouter",
    "IncludeAppInRouteNameRouter",
    "VuedaRouter",
)

from django.core.exceptions import ImproperlyConfigured
from rest_framework.routers import DynamicRoute
from rest_framework.routers import Route
from rest_framework.routers import SimpleRouter
from rest_framework.routers import flatten


class IncludeAppInRouteNameRouter(SimpleRouter):
    """
    A router that includes the app name in the route name, in case of model name conflicts between apps.
    """

    def get_default_basename(self, viewset):
        queryset = None
        if hasattr(viewset, "get_queryset"):
            queryset = viewset().get_queryset()

        if queryset is None:
            queryset = getattr(viewset, "queryset", None)

        assert queryset is not None, (
            "`basename` argument not specified, and could "
            "not automatically determine the name from the viewset, as "
            "it does not have a `.queryset` attribute."
        )

        return f"{queryset.model._meta.label_lower}"


class VuedaRouter(IncludeAppInRouteNameRouter):
    """
    A router that includes the functionality of IncludeAppInRouteNameRouter and allows actions to be marked as bulk.

    """

    routes = [
        # List route.
        Route(
            url=r"^{prefix}{trailing_slash}$",
            mapping={
                "get": "list",
                "delete": "destroy",
                "post": "create",
            },
            name="{basename}-list",
            detail=False,
            initkwargs={"suffix": "List"},
        ),
        # Dynamically generated list routes. Generated using
        # @action(detail=False) decorator on methods of the viewset.
        DynamicRoute(
            url=r"^{prefix}/{url_path}{trailing_slash}$", name="{basename}-{url_name}", detail=False, initkwargs={}
        ),
        # Detail route.
        Route(
            url=r"^{prefix}(?:/{lookup})?{trailing_slash}$",
            mapping={"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"},
            name="{basename}-detail",
            detail=True,
            initkwargs={"suffix": "Instance"},
        ),
        DynamicRoute(
            url=r"^{prefix}/{lookup}/{url_path}{trailing_slash}$",
            name="{basename}-{url_name}",
            detail=True,
            initkwargs={},
        ),
    ]

    def get_routes(self, viewset):
        known_actions = list(flatten([route.mapping.values() for route in self.routes if isinstance(route, Route)]))
        extra_actions = viewset.get_extra_actions()
        # checking action names against the known actions list
        not_allowed = [action.__name__ for action in extra_actions if action.__name__ in known_actions]
        if not_allowed:
            msg = (
                "Cannot use the @action decorator on the following methods, "
                "as they are existing routes: "
                f"{', '.join(not_allowed)}"
            )
            raise ImproperlyConfigured(msg)

        # partition detail and list actions
        detail_actions = [action for action in extra_actions if action.detail]
        list_actions = [action for action in extra_actions if not action.detail and not action.bulk]
        bulk_actions = [action for action in extra_actions if action.bulk]

        routes = []
        for route in self.routes:
            if isinstance(route, DynamicRoute) and route.detail:
                routes += [self._get_dynamic_route(route, action) for action in detail_actions]
            elif isinstance(route, DynamicRoute) and not route.detail:
                routes += [self._get_dynamic_route(route, action) for action in list_actions + bulk_actions]
            else:
                routes.append(route)
        return routes


class ContentTypeRouter(SimpleRouter):
    def get_lookup_regex(self, viewset, lookup_prefix=""):
        """
        instead of looking at the standard config attributes, always lookup by <app_label>/<model>
        """
        lookup_value = f"{lookup_prefix}(?P<app_label>[a-zA-Z0-9_]+)/(?P<model>[a-zA-Z0-9_]+)"
        return lookup_value


class ContentTypeChoicesRouter(SimpleRouter):
    # Need a custom route for list, so we can require app_label, model, and field in the url.
    # `field` allows `.` (unlike `app_label`/`model`, which name identifiers): a filter's public
    # name is dotted for a relation traversal (`distributor.name`) or a lookup expression
    # (`distributor.name.icontains`), and this is the URL a dotted filter's choices are fetched from.
    routes = [
        Route(
            url=r"^{prefix}/(?P<app_label>[a-zA-Z0-9_]+)/(?P<model>[a-zA-Z0-9_]+)/(?P<field>[a-zA-Z0-9_.]+){trailing_slash}$",
            mapping={
                "get": "list",
            },
            name="{basename}-list",
            detail=False,
            initkwargs={"suffix": "List"},
        ),
    ]

    def get_lookup_regex(self, viewset, lookup_prefix=""):
        """
        instead of looking at the standard config attributes, always lookup by <app_label>/<model>/<field>
        """
        lookup_value = f"{lookup_prefix}(?P<app_label>[a-zA-Z0-9_]+)/(?P<model>[a-zA-Z0-9_]+)/(?P<field>[a-zA-Z0-9_.]+)"
        return lookup_value
