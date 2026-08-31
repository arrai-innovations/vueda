"""Registry of the ``class Vueda`` model feature sections that optional feature apps provide."""

__all__ = (
    "FIRST_PARTY_SECTION_APPS",
    "FeatureOption",
    "FeatureSection",
    "get_feature_section",
    "get_feature_sections",
    "register_feature_section",
)

from collections.abc import Callable
from collections.abc import Iterable
from collections.abc import Mapping
from dataclasses import dataclass
from dataclasses import field
from typing import Any

from django.core.exceptions import ImproperlyConfigured


# Section names that a first-party VUEDA feature app owns, mapped to the app that registers them.
# Core knows the names so it can tell "this feature's app is not installed" from "this section does
# not exist". Core deliberately does not know any section's defaults. The owning app declares those.
FIRST_PARTY_SECTION_APPS = {
    "History": "vueda.history",
    "Workflow": "vueda.workflow",
}


@dataclass(frozen=True)
class FeatureOption:
    """One option inside a feature section.

    ``types`` restricts accepted values by ``isinstance``. ``validate`` receives a declared value and
    returns an error message, or ``None`` when the value is acceptable. ``merge`` combines an
    inherited value with an overriding one. Without it, a declaration replaces the inherited value.
    ``migration_relevant`` marks an option whose value a feature's migration generation reads.
    """

    default: Any = None
    types: tuple[type, ...] = ()
    validate: Callable[[Any], str | None] | None = None
    merge: Callable[[Any, Any], Any] | None = None
    migration_relevant: bool = False


@dataclass(frozen=True)
class FeatureSection:
    """A namespaced section that a feature app contributes to ``class Vueda``.

    ``name`` matches the nested class an author writes, exactly. ``app_label`` is the Django app
    label of the owning feature app. ``validate`` runs after option resolution and returns error
    messages for rules that span options. A failed section is reported by system checks and never
    reaches ``contribute``. ``contribute`` runs once per concrete model, right after Django prepares
    it, and may call ``model.add_to_class()`` to add fields or other behaviour.
    """

    name: str
    app_label: str
    options: Mapping[str, FeatureOption] = field(default_factory=dict)
    validate: Callable[[type, Mapping[str, Any]], Iterable[str]] | None = None
    contribute: Callable[[type, Any], None] | None = None


_SECTIONS: dict[str, FeatureSection] = {}


def register_feature_section(section: FeatureSection) -> FeatureSection:
    """Register ``section`` so ``class Vueda`` accepts it.

    Call this while the owning app's ``apps`` module is imported, not from ``AppConfig.ready()``.
    Django imports every application configuration before it imports any models module, so
    registration at that point is ready before Django constructs the first model, whatever order
    ``INSTALLED_APPS`` uses.

    Re-registering the same name from the same app replaces the previous definition, which keeps a
    reimported module working. A different app claiming a registered name is a configuration error.
    """
    existing = _SECTIONS.get(section.name)
    if existing is not None and existing.app_label != section.app_label:
        raise ImproperlyConfigured(
            f"Feature section {section.name!r} is already registered by app {existing.app_label!r}; "
            f"app {section.app_label!r} cannot register it again."
        )
    _SECTIONS[section.name] = section
    return section


def get_feature_section(name: str) -> FeatureSection | None:
    """Return the registered section called ``name``, or ``None`` when no app registered it."""
    return _SECTIONS.get(name)


def get_feature_sections() -> dict[str, FeatureSection]:
    """Return every registered section, keyed by name, in section-name order."""
    return {name: _SECTIONS[name] for name in sorted(_SECTIONS)}
