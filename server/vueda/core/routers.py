from rest_framework.routers import SimpleRouter


class IncludeAppInRouteNameRouter(SimpleRouter):
    """
    A router that includes the app name in the route name, in case of model name conflicts between apps.
    """

    def get_default_basename(self, viewset):
        queryset = getattr(viewset, "queryset", None)

        assert queryset is not None, (
            "`basename` argument not specified, and could "
            "not automatically determine the name from the viewset, as "
            "it does not have a `.queryset` attribute."
        )

        return f"{queryset.model._meta.label_lower}"


class ContentTypeRouter(SimpleRouter):
    def get_lookup_regex(self, viewset, lookup_prefix=""):
        """
        instead of looking at the standard config attributes, always lookup by <app_label>/<model>
        """
        lookup_value = f"{lookup_prefix}(?P<app_label>[a-zA-Z0-9_]+)/(?P<model>[a-zA-Z0-9_]+)"
        return lookup_value
