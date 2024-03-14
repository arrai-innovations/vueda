import sys
from copy import deepcopy

from django.core.exceptions import ImproperlyConfigured


_registry = {}


def register(canonical_serializer, canonical_viewset=None):
    """
    Register a model so that it can be used with ModelInfoViewSet.

    :param canonical_serializer: The serializer to use as a reference for the model.
    :param canonical_viewset: The viewset to use as a reference for the model.
    """
    from django.contrib.contenttypes.models import ContentType

    if canonical_viewset is None:

        def decorator(decorated_canonical_viewset):
            register(canonical_serializer, decorated_canonical_viewset)
            return decorated_canonical_viewset

        return decorator

    if hasattr(canonical_viewset.queryset, "model"):
        model = canonical_viewset.queryset.model

    elif hasattr(canonical_serializer.Meta, "model"):
        model = canonical_serializer.Meta.model

    else:
        raise ImproperlyConfigured(
            "Unable to determine the content type for while registering "
            f"{canonical_viewset} and {canonical_serializer}.  Either a model needs to be "
            f"defined in the serializer Meta or a queryset needs to be defined on the viewset."
        )

    content_type = ContentType.objects.get_for_model(model)

    if content_type.pk in _registry:
        # Content_type doesn't have a method to return "app.model".
        # Using content_type directly returns "app | model" (app_labeled_name).
        raise ValueError(f"ContentType {content_type.app_label}.{content_type.model} is already registered.")

    _registry[content_type.pk] = {
        "viewset": canonical_viewset,
        "serializer": canonical_serializer,
    }


def get_registration(content_type):
    """
    Get the registration for a content type.

    :param content_type: The content type to get the registration for.
    :return: The registration for the content type.
    """
    # this deepcopy is defensive to prevent inadvertent modification of the registry
    return deepcopy(_registry[content_type])


def get_all_registrations():
    """
    Get all the registrations.

    :return: All the registrations.
    """
    # this deepcopy is defensive to prevent inadvertent modification of the registry
    return deepcopy(_registry)


def get_registered_content_types():
    """
    Get all the registered content types.

    :return: All the registered content types.
    """
    return _registry.keys()


# Required for testing, so we can have separate registry dictionaries for each test.
if "pytest" in sys.modules:

    def get_empty_registry():
        global _registry
        _registry = {}
        return _registry
