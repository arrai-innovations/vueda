"""System checks validating VUEDA serializer configuration."""

import inspect

import rest_flex_fields.serializers as flex_serializers
from django.core.checks import Error
from rest_framework.fields import Field


def _resolve_lazy_serializer_string(lazy_path):
    """Resolve a flex-fields lazy serializer string, using flex-fields' own resolver.

    Returns ``(resolved_class, None)`` on success, or ``(None, error_message)`` if the
    string does not resolve to an importable class.
    """
    resolver = flex_serializers.FlexFieldsSerializerMixin.__new__(flex_serializers.FlexFieldsSerializerMixin)
    try:
        return resolver._get_serializer_class_from_lazy_string(lazy_path), None
    except Exception as exc:  # flex-fields raises a bare Exception on failed resolution
        return None, str(exc)


def _unwrap_expandable_field(field_data):
    """Split an ``expandable_fields`` value into ``(field_serializer, expand_options)``."""
    if isinstance(field_data, tuple):
        return field_data[0], field_data[1] if len(field_data) > 1 else {}
    return field_data, {}


def _validate_expandable_field(serializer_class, field_name, field_data):
    """Validate a single ``expandable_fields`` entry.

    Returns ``(errors, resolved_serializer)``. ``resolved_serializer`` is the class the
    entry ultimately points at (after unwrapping any tuple/lazy string), so the caller
    can recurse into it, or ``None`` if the entry is invalid.
    """
    errors = []

    if isinstance(field_data, list):
        errors.append(
            Error(
                f"{serializer_class.__name__}.Meta.expandable_fields[{field_name!r}] is a list.",
                hint="flex-fields only supports tuples for expandable_fields values, not lists.",
                obj=serializer_class,
                id="vueda_core.E001",
            )
        )
        return errors, None

    if isinstance(field_data, tuple) and len(field_data) != 2:  # noqa: PLR2004
        errors.append(
            Error(
                f"{serializer_class.__name__}.Meta.expandable_fields[{field_name!r}] is a {len(field_data)}-tuple.",
                hint="A tuple value must be exactly (Serializer/Field class or lazy string, options dict).",
                obj=serializer_class,
                id="vueda_core.E002",
            )
        )
        return errors, None

    field_serializer, expand_options = _unwrap_expandable_field(field_data)

    if isinstance(field_data, tuple) and not isinstance(expand_options, dict):
        errors.append(
            Error(
                f"{serializer_class.__name__}.Meta.expandable_fields[{field_name!r}] has a "
                f"{type(expand_options).__name__} options value.",
                hint="A tuple value's second element must be a dict of flex-fields expand options.",
                obj=serializer_class,
                id="vueda_core.E005",
            )
        )
        return errors, None

    if isinstance(field_serializer, str):
        resolved, error = _resolve_lazy_serializer_string(field_serializer)
        if error:
            errors.append(
                Error(
                    f"{serializer_class.__name__}.Meta.expandable_fields[{field_name!r}] has an unresolvable "
                    f"serializer string {field_serializer!r}.",
                    hint=error,
                    obj=serializer_class,
                    id="vueda_core.E003",
                )
            )
            return errors, None
        field_serializer = resolved

    if not inspect.isclass(field_serializer):
        errors.append(
            Error(
                f"{serializer_class.__name__}.Meta.expandable_fields[{field_name!r}] is not a Serializer/Field "
                "class, tuple, or serializer string.",
                hint=(
                    "It must be a tuple of (Serializer/Field class or lazy string, options dict), or simply a "
                    "Serializer/Field class or lazy string."
                ),
                obj=serializer_class,
                id="vueda_core.E004",
            )
        )
        return errors, None

    if not issubclass(field_serializer, Field):
        errors.append(
            Error(
                f"{serializer_class.__name__}.Meta.expandable_fields[{field_name!r}] resolves to "
                f"{field_serializer.__name__!r}, which is not a Serializer/Field subclass.",
                hint=("The class must subclass rest_framework.serializers.Serializer or rest_framework.fields.Field."),
                obj=serializer_class,
                id="vueda_core.E006",
            )
        )
        return errors, None

    return errors, field_serializer


def _get_routed_serializer_classes():
    """Return the serializer classes used by ViewSets registered with a router, anywhere in the URL conf.

    Walking the resolved URL conf (rather than vueda.info's registry) means this check covers any DRF
    ViewSet with a router route, not just ones registered with VUEDA's meta-info system -- the
    expandable_fields format being validated comes from rest_flex_fields, not VUEDA.
    """
    from django.urls import URLPattern
    from django.urls import URLResolver
    from django.urls import get_resolver

    def walk(patterns, seen_viewsets):
        serializer_classes = []
        for pattern in patterns:
            if isinstance(pattern, URLPattern):
                viewset_class = getattr(pattern.callback, "cls", None)
                if viewset_class is None or viewset_class in seen_viewsets:
                    continue
                seen_viewsets.add(viewset_class)
                serializer_class = getattr(viewset_class, "serializer_class", None)
                if serializer_class is not None:
                    serializer_classes.append(serializer_class)
            elif isinstance(pattern, URLResolver):
                serializer_classes.extend(walk(pattern.url_patterns, seen_viewsets))
        return serializer_classes

    return walk(get_resolver().url_patterns, set())


def check_expandable_fields_configuration(app_configs, **kwargs):
    errors = []
    checked_serializers = set()
    pending = _get_routed_serializer_classes()

    while pending:
        serializer_class = pending.pop()
        if serializer_class in checked_serializers:
            continue
        checked_serializers.add(serializer_class)

        meta = getattr(serializer_class, "Meta", None)
        expandable_fields = getattr(meta, "expandable_fields", {}) if meta else {}

        for field_name, field_data in expandable_fields.items():
            field_errors, resolved_serializer = _validate_expandable_field(serializer_class, field_name, field_data)
            errors.extend(field_errors)
            if resolved_serializer is not None and resolved_serializer not in checked_serializers:
                pending.append(resolved_serializer)

    return errors
