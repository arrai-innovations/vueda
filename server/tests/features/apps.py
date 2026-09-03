"""A test feature app, registering a section that exercises the ``class Vueda`` extension contract."""

__all__ = (
    "PROBE_SECTION",
    "FeaturesConfig",
)

from django.apps import AppConfig
from django.db import models

from vueda.core.features import FeatureOption
from vueda.core.features import FeatureSection
from vueda.core.features import register_feature_section


def _validate_tags(value):
    invalid = [entry for entry in value if not isinstance(entry, str)]
    if invalid:
        return f"Every tag must be a string. Found: {invalid!r}."
    return None


def _merge_tags(inherited, declared):
    """Accumulate tags across bases rather than replacing them, keeping first-seen order."""
    combined = list(inherited)
    combined.extend(entry for entry in declared if entry not in combined)
    return tuple(combined)


def _validate_probe_section(model, options):
    if options["label"] and not options["enabled"]:
        return [f"{model.__name__} sets a label while the Probe section is disabled."]
    return []


def _contribute_probe(model, options):
    """Expose exact-model policy and add a field where no concrete parent owns it.

    A plain class attribute can differ on each multi-table child, including a disabled child that
    must shadow an enabled parent. The database field proves migration visibility on root concrete
    models. A real feature must separately define how its database artifacts span parent and child
    tables instead of adding a clashing copy of an inherited field.
    """
    enabled = options.is_enabled("Probe")
    model.add_to_class("probe_policy_label", options["Probe"]["label"] if enabled else None)

    if not enabled or model._meta.parents:
        return
    model.add_to_class(
        "probe_note",
        models.CharField(max_length=64, blank=True, default=options["Probe"]["label"]),
    )


PROBE_SECTION = register_feature_section(
    FeatureSection(
        name="Probe",
        app_label="features",
        options={
            "enabled": FeatureOption(default=False, types=(bool,)),
            "label": FeatureOption(default="", types=(str,), migration_relevant=True),
            "tags": FeatureOption(default=(), types=(list, tuple), validate=_validate_tags, merge=_merge_tags),
        },
        validate=_validate_probe_section,
        contribute=_contribute_probe,
    )
)


class FeaturesConfig(AppConfig):
    name = "tests.features"
    label = "features"
    verbose_name = "Feature policy test app"
