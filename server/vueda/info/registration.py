"""Model registration for the meta-info API, mapping models to serializers and viewsets."""

__all__ = (
    "get_all_registrations",
    "get_lookup_field",
    "get_object_by_key",
    "get_registered_content_types",
    "get_registration",
    "get_serializer_for_model",
    "get_viewset_for_model",
    "register",
    "register_serializer",
)

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

    Called with both arguments, it registers the model at once and returns ``canonical_viewset``.

    Called with only ``canonical_serializer``, it registers nothing and returns a class decorator.
    Applying the decorator to a viewset class registers the serializer with that viewset and returns
    the class unchanged::

        @register(OrderSerializer)
        class OrderViewSet(VuedaViewSet):
            ...

    The decorator form registers the model when Python imports the module that defines the viewset,
    so it takes effect only if something imports that module. To register a model without a viewset, use
    ``register_serializer``.

    :param canonical_serializer: The serializer to use as a reference for the model. Only a ``Meta.model``
     is required; it does not need to inherit ``VuedaSerializer``. The ``/info/`` meta-API falls back to
     defaults for any ``VuedaExpandableFieldsSerializerMixin`` hooks (``generate_expand_model_info``,
     ``get_expand_model_info``, ``get_field_model_info``) that the serializer doesn't define.
    :param canonical_viewset: The viewset to use as a reference for the model. When omitted, the call
     returns the class decorator described above.
    """

    def decorator(decorated_canonical_viewset):
        if canonical_viewset is not None:
            decorated_canonical_viewset = canonical_viewset

        model = None
        if hasattr(canonical_serializer.Meta, "model"):
            model = canonical_serializer.Meta.model

        if model is None:
            raise ImproperlyConfigured(
                "Unable to determine the content type for while registering "
                f"{canonical_serializer}.  A model needs to be defined in the serializer Meta."
            )

        key = f"{model._meta.app_label}.{model._meta.model_name}"
        if key in _registry:
            raise ValueError(f"{key} is already registered.")

        _registry[key] = {
            "viewset": decorated_canonical_viewset,
            "serializer": canonical_serializer,
        }

        logger.info(
            "Registered %s.%s with %s and %s.",
            model._meta.app_label,
            model._meta.model_name,
            decorated_canonical_viewset,
            canonical_serializer,
        )

        return decorated_canonical_viewset

    if canonical_viewset is not None:
        return decorator(canonical_viewset)

    return decorator


def register_serializer(canonical_serializer):
    """
    Register a model so that it can be used with ModelInfoViewSet. You should do this in the ready method of an
     AppConfig, not as a side effect of importing viewsets or serializers.

    Because there is no viewset, the model info has no actions, filtering, or column totals, and its ordering
     metadata reports only the model's ``Meta.ordering`` default. Fields, expands, permissions, and the field choices
     endpoint work as they do for a model registered with a viewset. The filter choices endpoint answers 404, since
     there is no filterset.

    :param canonical_serializer: The serializer to use as a reference for the model. Only a ``Meta.model``
     is required; it does not need to inherit ``VuedaSerializer``. The ``/info/`` meta-API falls back to
     defaults for any ``VuedaExpandableFieldsSerializerMixin`` hooks (``generate_expand_model_info``,
     ``get_expand_model_info``, ``get_field_model_info``) that the serializer doesn't define.
    """

    def decorator(decorated_canonical_serializer):
        model = None
        if hasattr(canonical_serializer.Meta, "model"):
            model = canonical_serializer.Meta.model

        if model is None:
            raise ImproperlyConfigured(
                "Unable to determine the content type for while registering "
                f"{canonical_serializer}.  A model needs to be defined in the serializer Meta."
            )

        key = f"{model._meta.app_label}.{model._meta.model_name}"
        if key in _registry:
            raise ValueError(f"{key} is already registered.")

        _registry[key] = {
            "viewset": None,
            "serializer": canonical_serializer,
        }

        logger.info(
            "Registered %s.%s with %s.",
            model._meta.app_label,
            model._meta.model_name,
            canonical_serializer,
        )

        return decorated_canonical_serializer

    return decorator(canonical_serializer)


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


def get_serializer_for_model(model):
    """
    Return the canonical serializer class registered for ``model``, or ``None`` if the
    model has not been registered. Uses the in-process registry directly, avoiding the
    ContentType database query required by :func:`get_registration`.
    """
    key = f"{model._meta.app_label}.{model._meta.model_name}"
    entry = _registry.get(key)
    return entry["serializer"] if entry else None


def get_viewset_for_model(model):
    """
    Return the canonical viewset class registered for ``model``.

    Returns ``None`` when the model is unregistered or registered without a viewset. The function
    reads the in-process registry directly.
    """
    key = f"{model._meta.app_label}.{model._meta.model_name}"
    entry = _registry.get(key)
    return entry["viewset"] if entry else None


def resolve_lookup_field(model, lookup_field):
    """
    Return the name of the ``model`` field that a viewset's ``lookup_field`` value names.

    DRF's default ``lookup_field``, ``"pk"``, names the model's primary key field, so it resolves to
    that field's name. Any other value is already a field name and is returned unchanged.
    """
    return model._meta.pk.name if lookup_field == "pk" else lookup_field


def is_primary_key_lookup(model, lookup_field):
    """Return whether the viewset ``lookup_field`` value ``lookup_field`` names the primary key field of ``model``."""
    return resolve_lookup_field(model, lookup_field) == model._meta.pk.name


def object_key_of(instance, lookup_field):
    """
    Return the object key of ``instance``: the value of the field that the viewset ``lookup_field`` value names.

    This is the value that the instance's detail URL carries. A lookup field that is a foreign key gives the related
    row's key, not the related instance.
    """
    return instance.serializable_value(resolve_lookup_field(type(instance), lookup_field))


def viewset_lookup_field(viewset, model):
    """
    Return the name of the ``model`` field whose value ``viewset`` puts in its detail URLs.

    This is the viewset's ``lookup_field``, resolved by :func:`resolve_lookup_field`. A ``viewset``
    of ``None`` uses DRF's default, the primary key.
    """
    return resolve_lookup_field(model, getattr(viewset, "lookup_field", "pk"))


def viewset_lookup_url_kwarg(viewset):
    """
    Return the URL keyword that carries the object key in ``viewset``'s detail URLs.

    This is the viewset's ``lookup_url_kwarg``. A viewset that leaves it unset uses its
    ``lookup_field`` as the keyword, as DRF does. A ``viewset`` of ``None`` uses DRF's default,
    ``"pk"``.
    """
    return getattr(viewset, "lookup_url_kwarg", None) or getattr(viewset, "lookup_field", "pk")


def get_lookup_field(model):
    """
    Return the name of the field that identifies a ``model`` object in VUEDA's URLs and requests.

    This is the ``lookup_field`` of the model's registered viewset. A model without a registered
    viewset is identified by its primary key.
    """
    return viewset_lookup_field(get_viewset_for_model(model), model)


def get_object_by_key(queryset, key):
    """
    Return the object of ``queryset`` whose lookup field holds ``key``, or raise ``Http404``.

    ``queryset`` may also be a model class. ``key`` is an object key, the value that the model's
    detail URLs carry, as :func:`get_lookup_field` describes. A key that the lookup field cannot
    hold raises ``Http404`` too, as DRF's ``get_object_or_404`` does.
    """
    from rest_framework.generics import get_object_or_404

    model = getattr(queryset, "model", queryset)
    return get_object_or_404(queryset, **{get_lookup_field(model): key})


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
    from django.db.models import Q

    registered_keys = list(_registry.keys())
    if not registered_keys:
        return []

    query = Q()
    for app_label, model in (key.split(".") for key in registered_keys):
        query |= Q(app_label=app_label, model=model)

    return list(ContentType.objects.filter(query).values_list("pk", flat=True))


# Required for testing, so we can have separate registry dictionaries for each test.
if "pytest" in sys.modules:

    def get_empty_registry():
        global _registry
        _registry = {}
        return _registry
