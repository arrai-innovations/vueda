---
title: Model Feature Policy
type: explanation
audience: integrator
status: draft
---

# Model Feature Policy

A VUEDA model declares which framework features it participates in through one nested class:

```py
from vueda.core.models import VuedaModel


class CustomerOrder(VuedaModel):
    class Vueda:
        class History:
            enabled = True
            exclude_fields = ["temporary_token"]

        class Workflow:
            enabled = True
```

`class Vueda` is the only place a model author declares feature participation. Feature integrations read the resolved policy rather than the classes written above. One declaration can therefore drive server behaviour, metadata, schema, and migration generation.

Django's `class Meta` cannot hold these options. Django rejects unknown `Meta` attributes while it constructs a model. Widening the accepted names would change that behaviour for every model in the process, whether or not it belongs to VUEDA. `class Vueda` is a separate namespace, so `Meta` stays limited to Django's own model options.

## Which Models Carry Policy

Every model built on a VUEDA model base carries feature policy: `VuedaModel`, `Lookup`, `SingletonModel`, `EmailTemplateBase`, and anything derived from them. `VuedaModel` and `Lookup` are siblings rather than parent and child, so the policy deliberately covers both. Their current common root is `FormattedNameBaseModel`; integrations use `supports_vueda_feature_policy()` rather than repeating that inheritance check.

A model that is not built on a VUEDA base has no policy. Declaring `class Vueda` on one is a system-check error rather than a silent no-op.

## Sections and Options

A section is a nested class named after a feature, and its attributes are that feature's options. Each installed feature app registers the sections it owns. The registration defines each option's default, accepted types, validation, inheritance behaviour, and effect on migration generation.

Core does not know any feature's defaults. Whether history defaults on or workflow defaults off is a decision the owning app registers. Core knows only the names of first-party sections, which is what lets it tell an absent feature app from a misspelt section.

A section always resolves, whether or not a model declares it. An undeclared section takes the registered defaults, so a feature always reads a complete set of values.

## Reading the Resolved Policy

Feature integrations, metadata, schema, and migration code read one normalized object per model:

```py
from vueda.core.options import get_vueda_options


options = get_vueda_options(CustomerOrder)

options.is_enabled("History")             # True
options["History"]["exclude_fields"]      # ['temporary_token']
options["History"].exclude_fields         # the same value, as an attribute
options["History"].is_declared("enabled") # True: the author wrote it
options["History"].migration_values()     # only the migration-relevant options
```

`get_vueda_options()` resolves a model's policy on first access and caches it on the model. `is_declared()` separates an explicit choice from a registered default, which a feature needs when the two mean different things.

## Inheritance

An abstract or concrete base's declaration reaches every concrete model built from it. A subclass changes one option without redeclaring the sections or options it inherits, and without subclassing the parent's `Vueda` class:

```py
class AuditedBase(VuedaModel):
    class Vueda:
        class History:
            enabled = True
            exclude_fields = ["temporary_token"]

    class Meta:
        abstract = True


class ImportRow(AuditedBase):
    class Vueda:
        class History:
            enabled = False
            reason = "High-churn staging data"
```

`ImportRow` resolves to `enabled = False`, keeps the inherited `exclude_fields`, and adds its own `reason`.

Declarations apply in reverse method resolution order, from the most basic base down to the model itself, so a later declaration wins. Under multiple inheritance that makes the leftmost base win, matching ordinary Python attribute lookup.

A feature may register an option that accumulates instead of replacing. Without such a feature-specific merge rule, an explicit child value replaces the inherited value.

`History.exclude_fields` uses replacement. A child that does not declare it inherits the parent value. A child that declares it replaces the parent value. To extend the parent exclusions, reference them explicitly:

```py
class ImportRow(AuditedBase):
    class Vueda:
        class History:
            exclude_fields = [
                *AuditedBase.Vueda.History.exclude_fields,
                "staging_note",
            ]
```

Multi-table inheritance follows the same policy rules. Each concrete child receives its own resolved options and may override its parent. Feature contributors must apply behavior from the exact model's policy and define how their database artifacts behave across parent and child tables.

## Proxy Models

A proxy model takes the policy of its concrete model, and declaring `class Vueda` on a proxy is a system-check error.

History triggers attach to the shared database table, and workflow resolves a proxy to its concrete model when it records object state. Core cannot apply a separate proxy policy consistently, so accepting one would mean ignoring it.

## Feature Apps That Are Not Installed

Installing a feature app makes its feature available. The owning section then decides whether a given model participates. With `vueda.history` installed, history tracks eligible models by default unless they opt out. Installing `vueda.workflow` makes workflow available, but a model must explicitly opt in.

Declaring a section whose feature app is absent is a system-check error naming the app to install. A section name no installed app owns is a separate error listing the sections that are available. System checks report both cases.

## Validation

Resolution never raises. A faulty declaration becomes a system check error. `manage.py check`, `runserver`, and `migrate` report the model and option instead of failing while Django imports models.

The checks report unknown or unavailable sections, unknown options, and invalid values. They also report options outside a section, proxy declarations, and declarations on models that do not support VUEDA policy.

## Extension Contract for Feature Apps

A feature app registers its section at import time in its `apps` module. Django imports every application configuration before it imports any models module. Registration therefore finishes before Django constructs the first model, whatever order `INSTALLED_APPS` uses. Registering from `AppConfig.ready()` is too late.

```py
# myfeature/apps.py
from django.apps import AppConfig
from django.db import models

from vueda.core.features import FeatureOption
from vueda.core.features import FeatureSection
from vueda.core.features import register_feature_section


def _contribute(model, options):
    if options.is_enabled("MyFeature"):
        model.add_to_class("my_feature_note", models.CharField(max_length=64, blank=True, default=""))


register_feature_section(
    FeatureSection(
        name="MyFeature",
        app_label="myfeature",
        options={
            "enabled": FeatureOption(default=False, types=(bool,)),
            "note": FeatureOption(default="", types=(str,), migration_relevant=True),
        },
        contribute=_contribute,
    )
)


class MyFeatureConfig(AppConfig):
    name = "myfeature"
    label = "myfeature"
```

`FeatureOption` describes one option:

- `default` is the value a model gets without a declaration.
- `types` restricts accepted values by `isinstance`.
- `validate` receives a declared value and returns an error message, or `None` when the value is acceptable.
- `merge` combines an inherited value with an overriding one. Without it, a declaration replaces the inherited value.
- `migration_relevant` marks an option whose value the feature's migration generation reads.

`FeatureSection.validate` receives the model and its resolved section, and returns error messages for rules that span options. Resolution runs it before the contributor. Resolution omits a failed section from contribution and turns its messages into system-check errors.

`FeatureSection.contribute` runs once per concrete model, immediately after Django prepares it. It may call `model.add_to_class()` to add a database field, a `GenericRelation`, or a descriptor. A database field added here reaches `ModelState`, which is what keeps a migration-relevant option visible to migration generation. Contributors run in section-name order. VUEDA omits any section it could not resolve or validate, so a feature never acts on a faulty declaration.

A contributor receives every concrete multi-table child separately with that child's resolved policy. The feature must decide whether a database artifact belongs to the parent table, the child table, or both. It must not add a local field that clashes with a field inherited from a concrete parent.

A proxy model gets no contributor pass of its own, because its concrete model already received one for the shared table.

## Current Status

`class Vueda` is the declaration contract. The history and workflow integrations still follow the existing model, serializer, viewset, and filterset inheritance, and they will derive from this policy instead.

Until then, an explicit `enabled` that disagrees with a model's current base classes produces a system-check error. VUEDA does not accept and then ignore the declaration. Declaring `History.enabled = True` requires `VuedaHistoryModel`, and `Workflow.enabled = True` requires `HasWorkflowModelMixin`, exactly as before this contract existed.
