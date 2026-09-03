"""Resolution of the ``class Vueda`` declaration into one normalized options object per model."""

__all__ = (
    "DECLARATION_ATTRIBUTE",
    "OPTIONS_ATTRIBUTE",
    "DeclarationProblem",
    "SectionOptions",
    "VuedaOptions",
    "failed_sections",
    "get_vueda_options",
    "resolve_vueda_options",
)

import copy
from collections.abc import Iterable
from collections.abc import Iterator
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from vueda.core.features import FIRST_PARTY_SECTION_APPS
from vueda.core.features import FeatureSection
from vueda.core.features import get_feature_section
from vueda.core.features import get_feature_sections


#: Attribute holding the resolved options. Always read it out of a class ``__dict__``: reading it
#: with ``getattr`` would return a parent's options for a proxy or a concrete-inheritance child.
OPTIONS_ATTRIBUTE = "_vueda_options"

#: Name of the nested class an author writes on a model to declare feature policy.
DECLARATION_ATTRIBUTE = "Vueda"


@dataclass(frozen=True)
class DeclarationProblem:
    """A structural fault found while resolving a declaration, reported later by a system check.

    ``section`` names the feature section at fault, or is empty when the fault is not specific to
    one section. A section named here is left out of the contributor pass, so a feature never acts
    on a declaration that VUEDA could not resolve.
    """

    message: str
    hint: str
    check_id: str
    section: str = ""


class SectionOptions(Mapping):
    """Resolved values for one feature section, readable as attributes or as a mapping."""

    def __init__(self, section: FeatureSection, values: Mapping[str, Any], declared: Iterable[str] = ()):
        self.section = section
        self._values = dict(values)
        self._declared = frozenset(declared)

    @property
    def name(self) -> str:
        return self.section.name

    def is_declared(self, name: str) -> bool:
        """Return whether an author wrote ``name`` on this model or one of its bases.

        A feature that must tell an explicit choice from its own default reads this. Everything else
        should read the value, which already accounts for defaults and inheritance.
        """
        return name in self._declared

    def __getattr__(self, name: str) -> Any:
        try:
            return self.__dict__["_values"][name]
        except KeyError:
            raise AttributeError(f"Feature section {self.__dict__['section'].name!r} has no option {name!r}.") from None

    def __getitem__(self, name: str) -> Any:
        return self._values[name]

    def __iter__(self) -> Iterator[str]:
        return iter(self._values)

    def __len__(self) -> int:
        return len(self._values)

    def __repr__(self) -> str:
        return f"<SectionOptions {self.section.name}: {self._values!r}>"

    def migration_values(self) -> dict[str, Any]:
        """Return only the options the owning feature marked as migration relevant."""
        return {name: value for name, value in self._values.items() if self.section.options[name].migration_relevant}


class VuedaOptions(Mapping):
    """The normalized feature policy of one model.

    Feature integrations read this instead of the author-written nested classes. Every registered
    section is present, whether or not the model declared it, so a feature always sees its defaults.
    """

    def __init__(
        self,
        model: type,
        sections: Mapping[str, SectionOptions],
        problems: list[DeclarationProblem] | None = None,
    ):
        self.model = model
        self._sections = dict(sections)
        self.problems = problems or []

    def __getitem__(self, name: str) -> SectionOptions:
        return self._sections[name]

    def __iter__(self) -> Iterator[str]:
        return iter(self._sections)

    def __len__(self) -> int:
        return len(self._sections)

    def __repr__(self) -> str:
        return f"<VuedaOptions {self.model._meta.label}: {sorted(self._sections)}>"

    def get(self, name: str, default: Any = None) -> Any:
        """Return the resolved options for section ``name``, or ``default`` when it is unregistered."""
        return self._sections.get(name, default)

    def is_enabled(self, name: str) -> bool:
        """Return whether section ``name`` is registered and this model participates in it."""
        section = self._sections.get(name)
        return bool(section is not None and section.get("enabled", False))


def _declared_options(section_class: type) -> dict[str, Any]:
    """Return the option values written directly on one section class body."""
    return {name: value for name, value in vars(section_class).items() if not name.startswith("_")}


def _validate_declared_option(owner, section, option_name, option, value) -> DeclarationProblem | None:
    """Return a check problem when one author-written option value is invalid."""
    if option.types and not isinstance(value, option.types):
        accepted = ", ".join(sorted(accepted_type.__name__ for accepted_type in option.types))
        return DeclarationProblem(
            message=(f"{owner.__name__}.Vueda.{section.name}.{option_name} is a {type(value).__name__}."),
            hint=f"This option accepts: {accepted}.",
            check_id="vueda_core.E013",
            section=section.name,
        )

    if option.validate is None:
        return None

    try:
        message = option.validate(value)
    except Exception as exc:  # pragma: no cover - defensive boundary around feature extensions
        message = f"Validation raised {type(exc).__name__}: {exc}"

    if not message:
        return None

    return DeclarationProblem(
        message=f"{owner.__name__}.Vueda.{section.name}.{option_name} has an invalid value.",
        hint=message,
        check_id="vueda_core.E013",
        section=section.name,
    )


def _iter_declarations(model: type):
    """Yield each ``class Vueda`` in the model's ancestry, from the most basic base to the model."""
    for klass in reversed(model.__mro__):
        declaration = klass.__dict__.get(DECLARATION_ATTRIBUTE)
        if declaration is not None:
            yield klass, declaration


def _collect_declarations(model: type) -> tuple[dict[str, dict[str, Any]], list[DeclarationProblem]]:
    """Merge every ``class Vueda`` in the ancestry into one declaration per section.

    A declaration later in the method resolution order wins, per option, so a concrete model can
    change one option without redeclaring the sections or the options it inherits.
    """
    declarations: dict[str, dict[str, Any]] = {}
    problems: list[DeclarationProblem] = []

    for owner, declaration in _iter_declarations(model):
        for name, value in vars(declaration).items():
            if name.startswith("_"):
                continue

            if not isinstance(value, type):
                problems.append(
                    DeclarationProblem(
                        message=(f"{owner.__name__}.Vueda declares {name!r} outside of a feature section."),
                        hint=(
                            "Every option belongs to a feature section. Move it into a nested class named "
                            f"after a feature, such as 'class History:', inside {owner.__name__}.Vueda."
                        ),
                        check_id="vueda_core.E015",
                    )
                )
                continue

            section = get_feature_section(name)
            if section is None:
                problems.append(_unregistered_section_problem(owner, name))
                continue

            merged = declarations.setdefault(name, {})
            for option_name, option_value in _declared_options(value).items():
                option = section.options.get(option_name)
                if option is None:
                    problems.append(
                        DeclarationProblem(
                            message=f"{owner.__name__}.Vueda.{name} declares unknown option {option_name!r}.",
                            hint=(
                                f"The {name!r} section accepts: {', '.join(sorted(section.options)) or 'no options'}."
                            ),
                            check_id="vueda_core.E012",
                            section=name,
                        )
                    )
                    continue

                problem = _validate_declared_option(owner, section, option_name, option, option_value)
                if problem is not None:
                    problems.append(problem)
                    continue

                if option.merge is not None and option_name in merged:
                    try:
                        option_value = option.merge(merged[option_name], option_value)
                    except Exception as exc:  # pragma: no cover - defensive boundary around feature extensions
                        problems.append(
                            DeclarationProblem(
                                message=(
                                    f"{owner.__name__}.Vueda.{name}.{option_name} could not merge its inherited "
                                    "and declared values."
                                ),
                                hint=f"The feature's merge function raised {type(exc).__name__}: {exc}",
                                check_id="vueda_core.E013",
                                section=name,
                            )
                        )
                        continue
                merged[option_name] = option_value

    return declarations, problems


def _unregistered_section_problem(owner: type, name: str) -> DeclarationProblem:
    """Describe a section no app registered, separating an absent feature from an unknown name."""
    app_name = FIRST_PARTY_SECTION_APPS.get(name)
    if app_name is not None:
        return DeclarationProblem(
            message=f"{owner.__name__}.Vueda declares the {name!r} section, but {app_name!r} is not installed.",
            hint=f"Add {app_name!r} to INSTALLED_APPS, or remove the {name} section from {owner.__name__}.Vueda.",
            check_id="vueda_core.E011",
            section=name,
        )

    known = ", ".join(sorted(get_feature_sections())) or "no sections"
    return DeclarationProblem(
        message=f"{owner.__name__}.Vueda declares unknown feature section {name!r}.",
        hint=f"Installed feature apps provide: {known}.",
        check_id="vueda_core.E010",
        section=name,
    )


def failed_sections(problems: Iterable[DeclarationProblem]) -> set[str]:
    """Return the names of sections that ``problems`` shows VUEDA could not resolve."""
    return {problem.section for problem in problems if problem.section}


def resolve_vueda_options(model: type) -> VuedaOptions:
    """Resolve, cache, and return the normalized feature policy of ``model``.

    A proxy model shares the sections of its concrete model. History triggers attach to the shared
    database table and workflow resolves a proxy to its concrete model, so a separate proxy policy
    could not apply consistently, so declaring one is a system-check error rather than a silent no-op.

    Resolution never raises. Structural faults become ``problems`` that ``vueda.core.checks``
    reports, which keeps a broken declaration from turning into an import error with no context.
    """
    concrete_model = model._meta.concrete_model

    if model._meta.proxy and concrete_model is not model:
        options = get_vueda_options(concrete_model)
        problems = []
        if DECLARATION_ATTRIBUTE in model.__dict__:
            problems.append(
                DeclarationProblem(
                    message=f"{model.__name__} is a proxy model and declares class Vueda.",
                    hint=(
                        f"A proxy uses the feature policy of its concrete model. Declare the policy on "
                        f"{concrete_model.__name__} instead."
                    ),
                    check_id="vueda_core.E014",
                )
            )
        resolved = VuedaOptions(model, options._sections, problems)
        setattr(model, OPTIONS_ATTRIBUTE, resolved)
        return resolved

    declarations, problems = _collect_declarations(model)

    sections = {}
    for name, section in get_feature_sections().items():
        declared = declarations.get(name, {})
        values = {
            option_name: declared.get(option_name, copy.deepcopy(option.default))
            for option_name, option in section.options.items()
        }
        sections[name] = SectionOptions(section, values, declared.keys())

    unresolved = failed_sections(problems)
    for name, section_options in sections.items():
        validate = section_options.section.validate
        if validate is None or name in unresolved:
            continue

        try:
            messages = validate(model, section_options) or ()
        except Exception as exc:  # pragma: no cover - defensive boundary around feature extensions
            messages = [f"Validation raised {type(exc).__name__}: {exc}"]

        for message in messages:
            problems.append(
                DeclarationProblem(
                    message=f"{model.__name__}.Vueda.{name} is not valid for this model.",
                    hint=message,
                    check_id="vueda_core.E013",
                    section=name,
                )
            )

    resolved = VuedaOptions(model, sections, problems)
    setattr(model, OPTIONS_ATTRIBUTE, resolved)
    return resolved


def get_vueda_options(model: type) -> VuedaOptions:
    """Return the normalized feature policy of ``model``, resolving it if it is not resolved yet.

    This is the supported way for feature integrations, metadata, schema, and migration code to read
    a model's policy.
    """
    from vueda.core.models import supports_vueda_feature_policy

    if not supports_vueda_feature_policy(model):
        raise TypeError(
            f"{model!r} does not subclass a VUEDA model base such as VuedaModel or Lookup, so it has no "
            "VUEDA feature policy."
        )

    options = model.__dict__.get(OPTIONS_ATTRIBUTE)
    if options is None:
        options = resolve_vueda_options(model)
    return options
