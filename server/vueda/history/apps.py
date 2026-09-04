"""AppConfig for the vueda.history application, and its ``class Vueda`` feature section."""

__all__ = (
    "HISTORY_SECTION",
    "MANDATORY_EXCLUDED_FIELDS",
    "HistoryConfig",
)

import pghistory
from django.apps import AppConfig
from django.db import models

from vueda.core.features import FeatureOption
from vueda.core.features import FeatureSection
from vueda.core.features import register_feature_section


# Always applied, because a model declaration replaces inherited policy rather than adding to it.
# Identifying further sensitive fields in downstream models stays the integrator's responsibility.
MANDATORY_EXCLUDED_FIELDS = ("password",)


def _validate_field_names(value):
    """Reject an ``exclude_fields`` value that holds anything other than field names."""
    invalid = [entry for entry in value if not isinstance(entry, str)]
    if invalid:
        return f"Every entry must be a field name. Found: {invalid!r}."
    return None


def _concrete_field_names(model):
    """Return the names of the fields pghistory would copy onto the event model."""
    return {field.name for field in model._meta.concrete_fields}


def _resolve_exclusions(model, declared):
    """Return the field names pghistory must not copy, as author policy plus the mandatory floor."""
    names = _concrete_field_names(model)
    mandatory = [name for name in MANDATORY_EXCLUDED_FIELDS if name in names]
    return list(dict.fromkeys([*declared, *mandatory]))


def _expression_field_names(expression):
    """Return every model field name an unresolved query expression reads.

    A ``GeneratedField`` declared on a model holds ``F`` references rather than resolved columns,
    because nothing has bound it to a query yet. Walking the source expressions finds them.
    """
    names = set()
    stack = [expression]
    while stack:
        node = stack.pop()
        if isinstance(node, models.F):
            names.add(node.name)
            continue
        get_source_expressions = getattr(node, "get_source_expressions", None)
        if get_source_expressions is not None:
            stack.extend(get_source_expressions())
    return names


def _validate_history_section(model, options):
    """Report a history policy that pghistory cannot honour for this model.

    A failed section never reaches ``contribute``, which is what keeps an unsupported model away
    from ``pghistory.track``. That matters for a composite primary key: pghistory raises while
    Django constructs the model, before any system check can run, so an unguarded call would stop
    the app registry from populating and no check would ever report the cause.
    """
    if not options["enabled"]:
        return []

    if isinstance(model._meta.pk, models.CompositePrimaryKey):
        return [
            f"{model.__name__} has a composite primary key, which pghistory cannot track. Declare "
            f"enabled = False in its History section."
        ]

    errors = []
    declared = tuple(options["exclude_fields"])
    unknown = sorted(set(declared) - _concrete_field_names(model))
    if unknown:
        errors.append(f"exclude_fields names fields {model.__name__} does not have: {unknown}.")

    excluded = set(_resolve_exclusions(model, declared))
    for field in model._meta.concrete_fields:
        if not isinstance(field, models.GeneratedField) or field.name in excluded:
            continue
        missing = sorted(_expression_field_names(field.expression) & excluded)
        if missing:
            errors.append(
                f"{field.name} is a generated field reading {missing}, so excluding those fields would leave "
                f"its expression without the columns it needs. Exclude {field.name} as well, or keep them."
            )
    return errors


def _contribute_history(model, options):
    """Register pghistory event models and triggers for a model whose policy enables history.

    Django has finished building the model by the time this runs, so pghistory sees every field.
    The trackers are built here rather than shared, because a tracker resolves its trigger condition
    against the first model it is applied to and keeps it, which leaks one model's field list into
    the next.
    """
    section = options["History"]
    if not section["enabled"] or not model._meta.managed:
        return

    pghistory.track(
        pghistory.InsertEvent(),
        pghistory.UpdateEvent(),
        pghistory.DeleteEvent(),
        exclude=_resolve_exclusions(model, section["exclude_fields"]) or None,
    )(model)


HISTORY_SECTION = register_feature_section(
    FeatureSection(
        name="History",
        app_label="vueda_history",
        options={
            "enabled": FeatureOption(default=True, types=(bool,)),
            "exclude_fields": FeatureOption(
                default=(),
                types=(list, tuple),
                validate=_validate_field_names,
                migration_relevant=True,
            ),
            "reason": FeatureOption(default="", types=(str,)),
        },
        validate=_validate_history_section,
        contribute=_contribute_history,
        # Event models must include fields that earlier contributors add.
        contribute_order=100,
    )
)


class HistoryConfig(AppConfig):
    name = "vueda.history"
    label = "vueda_history"
    verbose_name = "VUEDA History"

    def ready(self):
        from django.core.checks import register

        from .checks import check_history_middleware

        register(check_history_middleware)
