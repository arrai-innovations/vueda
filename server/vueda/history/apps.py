"""AppConfig for the vueda.history application, and its ``class Vueda`` feature section."""

__all__ = (
    "HISTORY_SECTION",
    "HistoryConfig",
)

from django.apps import AppConfig

from vueda.core.features import FeatureOption
from vueda.core.features import FeatureSection
from vueda.core.features import register_feature_section


def _validate_field_names(value):
    """Reject an ``exclude_fields`` value that holds anything other than field names."""
    invalid = [entry for entry in value if not isinstance(entry, str)]
    if invalid:
        return f"Every entry must be a field name. Found: {invalid!r}."
    return None


def _validate_history_section(model, options):
    """Report an explicit history choice that this release cannot honour yet.

    History tracking still follows ``VuedaHistoryModel`` inheritance. Until the history integration
    derives from this policy, an explicit ``enabled`` that disagrees with the model's base classes
    would be accepted and then ignored, so it is a configuration error instead.
    """
    if not options.is_declared("enabled"):
        return []

    from vueda.history.models import VuedaHistoryModel

    tracked = issubclass(model, VuedaHistoryModel)
    if options["enabled"] and not tracked:
        return [
            f"{model.__name__} declares enabled = True but does not subclass VuedaHistoryModel, which is what "
            "currently tracks a model. Subclass VuedaHistoryModel as well."
        ]
    if not options["enabled"] and tracked:
        return [
            f"{model.__name__} declares enabled = False but subclasses VuedaHistoryModel, which currently tracks "
            "a model regardless of this policy. Stop subclassing VuedaHistoryModel as well."
        ]
    return []


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
    )
)


class HistoryConfig(AppConfig):
    name = "vueda.history"
    label = "vueda_history"
    verbose_name = "VUEDA History"
