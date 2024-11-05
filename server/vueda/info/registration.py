import logging
import sys
from copy import deepcopy

from django.core.exceptions import ImproperlyConfigured


_registry = {}

logger = logging.getLogger(__name__)


def register(canonical_serializer, canonical_viewset=None):
    """
    Register a model so that it can be used with ModelInfoViewSet. You should do this in the ready method of an
     AppConfig, not as a side effect of importing viewsets or serializers.

    :param canonical_serializer: The serializer to use as a reference for the model.
    :param canonical_viewset: The viewset to use as a reference for the model.
    """

    if canonical_viewset is None:

        def decorator(decorated_canonical_viewset):
            register(canonical_serializer, decorated_canonical_viewset)
            return decorated_canonical_viewset

        return decorator

    model = None
    if hasattr(canonical_serializer.Meta, "model"):
        model = canonical_serializer.Meta.model

    elif hasattr(canonical_viewset, "get_queryset") and canonical_viewset().get_queryset() is not None:
        queryset = canonical_viewset().get_queryset()
        model = queryset.model

    if model is None and hasattr(canonical_viewset.queryset, "model"):
        model = canonical_viewset.queryset.model

    if model is None:
        raise ImproperlyConfigured(
            "Unable to determine the content type for while registering "
            f"{canonical_viewset} and {canonical_serializer}.  Either a model needs to be "
            f"defined in the serializer Meta or a queryset needs to be defined on the viewset."
        )

    key = f"{model._meta.app_label}.{model._meta.model_name}"
    if key in _registry:
        raise ValueError(f"{key} is already registered.")

    _registry[key] = {
        "viewset": canonical_viewset,
        "serializer": canonical_serializer,
    }

    logger.info(
        "Registered %s.%s with %s and %s.",
        model._meta.app_label,
        model._meta.model_name,
        canonical_viewset,
        canonical_serializer,
    )


def get_registration(content_type):
    """
    Get the registration for a content type.

    :param content_type: The content type to get the registration for.
    :return: The registration for the content type.
    """
    from django.contrib.contenttypes.models import ContentType

    try:
        # Fetch the ContentType object based on its PK
        content_type = ContentType.objects.get(pk=content_type)
    except ContentType.DoesNotExist:
        raise ValueError(f"ContentType {content_type} does not exist.")

        # Construct the key as "app_label.model"
    key = f"{content_type.app_label}.{content_type.model}"

    # this deepcopy is defensive to prevent inadvertent modification of the registry
    return deepcopy(_registry[key])


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
    from django.contrib.contenttypes.models import ContentType

    registered_keys = list(_registry.keys())
    content_types = []

    for key in registered_keys:
        app_label, model = key.split(".")
        try:
            content_type = ContentType.objects.get(app_label=app_label, model=model)
            content_types.append(content_type.pk)
        except ContentType.DoesNotExist:
            # Handle the case where the ContentType might not exist yet (e.g., before migrations)
            pass

    return content_types


# Required for testing, so we can have separate registry dictionaries for each test.
if "pytest" in sys.modules:

    def get_empty_registry():
        global _registry
        _registry = {}
        return _registry
