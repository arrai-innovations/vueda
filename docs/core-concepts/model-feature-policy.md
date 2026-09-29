---
title: Model Feature Policy
type: explanation
audience: integrator
status: draft
---

# Model Feature Policy

A model's {@term Feature Policy} declares which framework features the model participates in. You write it as one nested class:

```py
from django.db import models

from vueda.core.models import VuedaModel


class CustomerOrder(VuedaModel):
    temporary_token = models.CharField(max_length=64, blank=True)

    class Vueda:
        class History:
            enabled = True
            exclude_fields = ["temporary_token"]

        class Workflow:
            enabled = True
```

`class Vueda` is the only place where a model author declares feature participation. Feature integrations read the resolved policy, which combines these classes with defaults and inheritance. One declaration therefore drives server behavior, metadata, schema, and migration generation.

`class Vueda` is separate from Django's `class Meta` because Django rejects unknown `Meta` attributes while it constructs a model. Widening the accepted names would change that behavior for every model in the process, including models outside VUEDA. The separate namespace keeps `Meta` limited to Django's own model options.

## Which Models Carry Policy

Every {@term VUEDA Model} carries feature policy. That covers models built on [`VuedaModel`]{@api py:class:vueda.core.models.VuedaModel} or [`Lookup`]{@api py:class:vueda.core.models.Lookup}. It also covers the abstract bases derived from `VuedaModel`, [`SingletonModel`]{@api py:class:vueda.core.models.SingletonModel} and [`EmailTemplateBase`]{@api py:class:vueda.core.models.EmailTemplateBase}. `VuedaModel` and `Lookup` are siblings, and both derive from [`FormattedNameBaseModel`]{@api py:class:vueda.core.models.FormattedNameBaseModel}. Integrations test membership with [`supports_vueda_feature_policy()`]{@api py:function:vueda.core.models.supports_vueda_feature_policy}, so they do not depend on that inheritance.

A model built on another base has no policy. Declaring `class Vueda` on one is a system-check error.

A model that VUEDA ships carries the policy that VUEDA declared for it, and a project cannot change that policy. History reads the policy while Django builds the model, and VUEDA's published migrations already hold the event models that the policy produced. Your own models carry the policy that you write, and `makemigrations` writes the resulting event models and triggers into your project's migrations.

## Sections and Options

A section is a nested class named after a feature, and its attributes are that feature's options. Each installed feature app registers the sections that it provides. The registration defines each option's default, accepted types, validation, inheritance behavior, and effect on migration generation.

Core holds no feature defaults. `vueda.history` registers history as on by default, and `vueda.workflow` registers workflow as off by default. Core knows only the names of the first-party sections, `History` and `Workflow`, so it can tell an absent feature app from a misspelled section.

Every registered section resolves for every model, whether or not the model declares it. An undeclared section takes the registered defaults, so a feature always reads a complete set of values.

## Reading the Resolved Policy

Feature integrations, metadata, schema, and migration code read one resolved object per model, a [`VuedaOptions`]{@api py:class:vueda.core.options.VuedaOptions}:

```py
from vueda.core.options import get_vueda_options


options = get_vueda_options(CustomerOrder)

options.is_enabled("History")             # True
options["History"]["exclude_fields"]      # ['temporary_token']
options["History"].exclude_fields         # the same value, as an attribute
options["History"].is_declared("enabled") # True: the author wrote it
options["History"].migration_values()     # only the migration-relevant options
```

[`get_vueda_options()`]{@api py:function:vueda.core.options.get_vueda_options} resolves a model's policy on first access and caches it on the model. It raises {@api ext:python:TypeError} for a model that is not a VUEDA model. [`is_declared()`]{@api py:function:vueda.core.options.SectionOptions.is_declared} separates an explicit choice from a registered default, which a feature needs when the two mean different things. [`migration_values()`]{@api py:function:vueda.core.options.SectionOptions.migration_values} returns the options that the feature's migration generation reads.

## Inheritance

A declaration on an abstract or concrete base reaches every concrete model built from it. A subclass changes one option without redeclaring the sections or options that it inherits, and without subclassing the parent's `Vueda` class:

```py
class AuditedBase(VuedaModel):
    temporary_token = models.CharField(max_length=64, blank=True)

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

`ImportRow` resolves to `enabled = False`, keeps the inherited `exclude_fields`, and adds its own `reason`. `reason` is a note for readers of the code, and VUEDA does not act on it.

Declarations apply in reverse method resolution order, from the most basic base down to the model itself, so a later declaration wins. Under multiple inheritance, the leftmost base wins, which matches ordinary Python attribute lookup.

A feature may register an option that accumulates inherited and declared values. Every other option uses replacement: an explicit child value replaces the inherited value.

`History.exclude_fields` uses replacement. A child that does not declare it inherits the parent value, and a child that declares it replaces the parent value. To extend the parent exclusions, reference them explicitly:

```py
class ImportRow(AuditedBase):
    staging_note = models.TextField(blank=True)

    class Vueda:
        class History:
            exclude_fields = [
                *AuditedBase.Vueda.History.exclude_fields,
                "staging_note",
            ]
```

Multi-table inheritance follows the same rules. Each concrete child resolves its own policy, inherits its concrete parent's declarations, and may override them.

## Proxy Models

A proxy model takes the policy of its concrete model. Declaring `class Vueda` on a proxy is a system-check error.

History triggers attach to the shared database table, and workflow resolves a proxy to its concrete model when it records object state. A separate proxy policy could not apply consistently, so VUEDA rejects one. [Expose a Proxy Model as a Separate CRUD Surface](../guides/proxy-models#how-history-tracking-works-for-proxy-models) describes how history behaves for a proxy.

## Feature Apps That Are Not Installed

Installing a feature app makes its feature available, and the model's section decides whether the model participates. Every supported configuration installs `vueda.history`, so history tracks each eligible model unless its policy opts out. `vueda.workflow` is optional, and a model opts in explicitly even where a project installs it. [Django App Boundaries](./architecture-overview#django-app-boundaries) lists which apps a configuration may omit.

Declaring a section whose feature app is not installed is a system-check error that names the app to install. For example, a model that declares a `Workflow` section in a project without `vueda.workflow` reports that error. A section name that no installed app registers is a separate error, which lists the sections that are available.

## Validation

Resolving a VUEDA model's policy never raises. A faulty declaration becomes a system-check error that names the model and the option. `manage.py check`, `runserver`, and `migrate` report it, so the fault never surfaces as an error while Django imports models.

[`check_model_feature_policy`]{@api py:function:vueda.core.checks.check_model_feature_policy} reports these codes:

| Code              | Cause                                                                             |
| ----------------- | --------------------------------------------------------------------------------- |
| `vueda_core.E010` | A section that no installed app registers. The hint lists the available sections. |
| `vueda_core.E011` | A first-party section whose app is not installed. The hint names the app.         |
| `vueda_core.E012` | An option that the section does not define.                                       |
| `vueda_core.E013` | An invalid option value, or a section that fails its feature's own validation.    |
| `vueda_core.E014` | A `class Vueda` declaration on a proxy model.                                     |
| `vueda_core.E015` | An attribute directly inside `class Vueda`, outside any section.                  |
| `vueda_core.E016` | A `class Vueda` declaration on a model that is not a VUEDA model.                 |

## Extension Contract for Feature Apps

A feature app registers its section with [`register_feature_section()`]{@api py:function:vueda.core.features.register_feature_section} when Django imports the app's `apps` module. Django imports every application configuration before it imports any models module. Registration therefore finishes before Django constructs the first model, whatever order {@api ext:django:setting:INSTALLED_APPS} uses. {@api ext:django:django.apps.AppConfig.ready} runs too late for registration.

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

If a second app registers a section name that another app already registered, the call raises {@api ext:django:django.core.exceptions.ImproperlyConfigured}.

[`FeatureOption`]{@api py:class:vueda.core.features.FeatureOption} describes one option:

- `default` is the value that a model gets without a declaration.
- `types` restricts accepted values by {@api ext:python:isinstance}.
- `validate` receives a declared value and returns an error message. It returns `None` when the value is acceptable.
- `merge` combines an inherited value with an overriding one. Without it, a declaration replaces the inherited value.
- `migration_relevant` marks an option whose value the feature's migration generation reads.

[`FeatureSection.validate`]{@api py:property:vueda.core.features.FeatureSection.validate} receives the model and its resolved section, and returns error messages for rules that span options. Resolution runs it before any contributor, and turns its messages into system-check errors.

[`FeatureSection.contribute`]{@api py:property:vueda.core.features.FeatureSection.contribute} runs once per concrete model, on {@api ext:django:django.db.models.signals.class_prepared}, after Django builds the model's fields. It may call `model.add_to_class()` to add a database field, a {@api ext:django:django.contrib.contenttypes.fields.GenericRelation}, or a descriptor. A database field added here reaches the migration state, which keeps a migration-relevant option visible to `makemigrations`.

Contributors run in [`contribute_order`]{@api py:property:vueda.core.features.FeatureSection.contribute_order}, lowest first, with the section name breaking a tie. A feature that reads a model's finished field list sets a high order, so it runs after every feature that adds a field. History does this, which is why an event model includes the fields that another feature contributed. VUEDA skips the contributor of any section with an error, so a feature never acts on a faulty declaration.

A contributor receives each concrete multi-table child separately, with that child's resolved policy. Your feature decides whether a database artifact belongs to the parent table, the child table, or both. It must not add a local field that clashes with a field inherited from a concrete parent.

A proxy model gets no contributor pass of its own, because its concrete model already received one for the shared table.

## History and Workflow

{@term Model History} follows the [`History` section]{@api py:property:vueda.history.apps.HISTORY_SECTION}. `History.enabled` decides whether a model is tracked, and `History.exclude_fields` decides which of its columns reach the event model. History also leaves any field named `password` out of the event model, whatever `exclude_fields` says. The History section reports these cases as `vueda_core.E013`:

- `exclude_fields` names a field that the model does not have.
- A {@api ext:django:django.db.models.GeneratedField} stays in while `exclude_fields` excludes a field that it reads. Exclude the generated field too.
- A model with a {@term Composite Primary Key} keeps history enabled. pghistory cannot track such a model, so it must set `enabled = False`.

Event rows accumulate for as long as a model is tracked. [Purge Model History Rows](../guides/purge-model-history) describes that storage and how to remove old rows.

A {@term Workflow-Enabled Model} follows the [`Workflow` section]{@api py:property:vueda.workflow.apps.WORKFLOW_SECTION}. `Workflow.enabled` is its only option, and it defaults to `False`, so installing `vueda.workflow` enables workflow on no model. An enabled model receives:

- the methods of [`WorkflowModelMethods`]{@api py:class:vueda.workflow.models.WorkflowModelMethods}, such as [`available_transitions()`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.available_transitions}, [`apply_transition()`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.apply_transition}, and the [`on_transition()`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.on_transition} and [`get_transition_warnings()`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.get_transition_warnings} hooks, which VUEDA adds to the end of the model's bases;
- an {@term Object State} in the workflow's initial state whenever a save finds none;
- `workflow_state_code`, `workflow_state_name`, and {@term Valid Transitions} on every [`VuedaSerializer`]{@api py:class:vueda.core.serializers.VuedaSerializer} of the model;
- a `workflow_state` filter on every [`VuedaFilterSet`]{@api py:class:vueda.core.filters.VuedaFilterSet} of the model;
- the {@term Workflow Overlay} on its viewsets, and [`workflow_enabled: true`]{@api py:property:vueda.info.serializers.ModelInfoSerializer.workflow_enabled} in its {@term Model Info}.

The methods sit last in the method resolution order. A method that the model or one of its other bases defines takes precedence, and an override reaches the default through {@api ext:python:super}. A model field that would hide one of these attributes, such as a field named `workflow`, is a system-check error (`vueda_core.E013`).

A secondary serializer, such as a compact one nested in another model's payload, leaves out the workflow fields with `Meta.workflow_fields = False` ([`WorkflowFieldsSerializerMixin`]{@api py:class:vueda.core.serializers.WorkflowFieldsSerializerMixin}). `valid_transitions` resolves the permitted transitions of every row that it renders, so a nested serializer that keeps it pays that cost per row. Leaving the fields out changes no permission. The workflow endpoints still decide which transitions a user may see and take.

The policy declares participation, and a {@term Workflow} definition in the database supplies the states, transitions, and permissions. A `Workflow` row alone does not enable workflow on a model. For an enabled model without a definition, saving an object and every workflow request raise {@api py:class:vueda.workflow.exceptions.WorkflowNotConfiguredError}. The API returns it as HTTP 500. [Manage Workflows](../guides/manage-workflows#enabling-workflow-on-a-model-with-existing-rows) describes the checks that warn about a missing definition and how to add workflow to a model that already has rows. Code outside VUEDA reads a model's participation with {@api py:function:vueda.core.installed_apps.workflow_enabled}.

The client reads the same flag as [`workflowEnabled`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#ModelInfo.workflowEnabled} in the model's model info. [`storeWorkflow`]{@api js:function:@arrai-innovations/vueda/stores/storeWorkflow#storeWorkflow} sends a workflow request only for a model whose model info has `workflowEnabled: true`, and fetches that model info first when it is not cached. For any other model it returns an empty list without a workflow request. The flag controls which requests the client sends. The server still enforces workflow permissions and transition rules.
