---
title: Server
type: reference
audience: integrator
status: draft
---

# Server Changelog

Integrator-facing changes for the `vueda` Python package.

Use this page for changes that affect server package consumers: Django apps, settings, serializers, viewsets,
permissions, metadata responses, management commands, migrations, REST behavior, and compatibility notes.

## Public Baseline

Earlier VUEDA server versions existed for internal or private use. The v3 prerelease series is the first
public-facing documentation baseline.

## vNext (unreleased)

### Breaking Changes

- **Model history moves to PostgreSQL triggers**:
    - `vueda.history` now records changes through `django-pghistory` and `django-pgtrigger` instead of Django signals, and it tracks every eligible `VuedaModel` subclass by default rather than only those inheriting a history-specific base. A model controls its own tracking through `class Vueda.History`: `enabled` opts a model out, `exclude_fields` keeps named columns out of the event model, and `reason` records why. `password` is always excluded, whatever a model declares, because a declaration replaces inherited policy rather than adding to it. Installing `vueda.history` adds `pghistory` and `pgtrigger` to `INSTALLED_APPS` and sets `PGHISTORY_APPEND_ONLY`, so event tables reject updates and deletes at the database. VUEDA keeps pghistory's `ContextForeignKey`, row-level trigger, and indexing defaults, and ships no retention policy.
    - Every app containing a tracked model gains an event model and trigger migrations of its own. Installing or removing `vueda.history` therefore changes generated migrations, and settings modules that share one migration history must all include the app or all omit it.
    - A model with a composite primary key cannot be tracked and reports `vueda_core.E013` until its `History` section sets `enabled = False`. An `exclude_fields` entry naming a field the model does not have, or a field a retained generated field's expression reads, reports the same check. Proxy models write to the concrete model's event table and generate no event model of their own. Unmanaged models are skipped, because VUEDA does not own their tables.
      _Run `makemigrations` after upgrading and review the generated event models and triggers in each app that owns a tracked model. Purging event rows requires `pgtrigger.ignore`, because append-only otherwise blocks the delete. A model that should not be tracked needs `class Vueda.History` with `enabled = False`; a model in an optional app cannot declare that section unless the project also installs `vueda.history`._

- **History classes move to the app that owns them**:
    - `VuedaHistorySerializer` moves from `vueda.core.serializers` to `vueda.history.serializers`, and `VuedaHistoryViewSet` moves from `vueda.core.viewsets` to `vueda.history.viewsets`. Both classes are unchanged; only their import path moves. `vueda.core` no longer imports `vueda.history` at all, so a project that omits the optional history app now loads no history module.
    - `SimpleHistoryModelMixin`, `SimpleHistoryManager`, and `ProxyAwareHistoricalRecords` move from `vueda.history.models` to `vueda.core.simple_history`. `vueda.workflow` tracks its own models through that mixin and must reach it without importing the optional history app. The generated `Historical*` models keep the `vueda_workflow` app label, and this change generates no migrations.
      _Update `from vueda.core.serializers import VuedaHistorySerializer` to `from vueda.history.serializers import VuedaHistorySerializer`, and `from vueda.core.viewsets import VuedaHistoryViewSet` to `from vueda.history.viewsets import VuedaHistoryViewSet`. A project that imported the simple-history mixin, manager, or records class from `vueda.history.models` should import it from `vueda.core.simple_history` instead. `VuedaHistoryModel` stays in `vueda.history.models`._
- **Read-only serializer permission metadata**:
    - Model-info `model_permissions` now exposes only the mapped `list` and `read` permissions when a model's canonical serializer subclasses `VuedaReadonlySerializer`. Other permission rows remain in Django's permission table, and the change does not alter server authorization.
      _If an integration treated `model_permissions` as a complete database permission inventory, account for the filtered read-only surface or query Django's permission model directly._
- **Filter choice empty options**:
    - `model_info_filter_choices` no longer prepends or returns empty-valued options. This removes the previous synthetic option driven by `empty_label`, `empty_value`, `EMPTY_CHOICE_LABEL`, and `EMPTY_CHOICE_VALUE`; it also omits blank values discovered by all-values filters. A missing filter query parameter now represents "no filter" in this endpoint's contract.
      _Render any clear, all, or no-selection affordance in the client outside the server-provided choices list._
- **File and image field representation**:
    - `VuedaSerializer` now maps `models.FileField` and `models.ImageField` columns to VUEDA's serializer fields, which represent a stored file as `{"name": ..., "url": ...}` (with an absolute `url` when a request is in context) instead of DRF's plain URL string. This applies to any file or image column auto-built by a VUEDA serializer.
      _Update client or integration code that read a bare URL string from these fields. The v3 client widgets (`WidgetFile`, `WidgetImage`) already consume the `{name, url}` shape. To keep the previous plain-string behavior on a specific field, declare a stock `rest_framework.serializers.FileField`/`ImageField` explicitly on your serializer._
- **`get_expandable_fields()` renamed to `get_expand_model_info()`**:
    - The serializer override hook for customizing `model_expands` metadata is renamed and its signature changed. It now receives the already-generated list of expand descriptors and must return a list in the same shape, instead of being called with no arguments and calling `super().get_expandable_fields()` to obtain the base list. It remains defined on `VuedaExpandableFieldsSerializerMixin`.
      _Rename any `get_expandable_fields(self)` override to `get_expand_model_info(self, expands)`, drop the `super()` call, and operate on the `expands` parameter directly._
- **`VuedaValidationError` no longer supports `is_warning`**:
    - The `is_warning` constructor argument and attribute, the `_get_error_details` warning branching, and the `get_error_details_as_warning` helper are removed. `vueda.core.logging_filters` (the `FilterOutVuedaValidationWarnings` log filter and `contains_only_warnings` helper) is deleted, along with its `LOGGING` filter registration in `get_defaults()`. It is no longer possible to raise a warning-coded validation error that still returns 400 and blocks the write; use `get_warnings()` (see below) for advisory, confirm-before-write feedback instead.
    - Sentry capture in `debug_stack_exception_handler` now checks `isinstance(exc, rest_framework.exceptions.ValidationError)` directly instead of `contains_only_warnings(exc)`. The captured set is unchanged: validation errors are still captured, and handled 404, permission, and `ConfirmationRequired` responses are still not.
      _No repository production code raised `is_warning=True`; only a logging test fixture did. If a downstream project raised it, migrate to `get_warnings()`. If a downstream project imported `vueda.core.logging_filters` or referenced the `ignore_validation_warnings` `LOGGING` filter, remove that import and filter reference._
- **`valid_transitions` entries are objects, not code strings (`AvailableTransitionField`)**:
    - `AvailableTransitionField` now returns each entry as `{"code": ..., "name": ...}` instead of a bare transition-code string. Model info reports the field's `type_serializer` as `DictField` instead of `CharField` accordingly. This lets clients render a transition's display name without a second lookup, and is what allows the v3 client's `useDetailView` to read available transitions straight off the fetched object instead of issuing a separate per-object transitions request.
      _Update any code reading `valid_transitions` entries as plain strings to read the `code` (and optionally `name`) key off each object instead._
- **`VuedaValidationError` no longer supports `is_warning`**:
    - The `is_warning` constructor argument and attribute, the `_get_error_details` warning branching, and the `get_error_details_as_warning` helper are removed. `vueda.core.logging_filters` (the `FilterOutVuedaValidationWarnings` log filter and `contains_only_warnings` helper) is deleted, along with its `LOGGING` filter registration in `get_defaults()`. It is no longer possible to raise a warning-coded validation error that still returns 400 and blocks the write; use `get_warnings()` (see below) for advisory, confirm-before-write feedback instead.
    - Sentry capture in `debug_stack_exception_handler` now checks `isinstance(exc, rest_framework.exceptions.ValidationError)` directly instead of `contains_only_warnings(exc)`. The captured set is unchanged: validation errors are still captured, and handled 404, permission, and `ConfirmationRequired` responses are still not.
      _No repository production code raised `is_warning=True`; only a logging test fixture did. If a downstream project raised it, migrate to `get_warnings()`. If a downstream project imported `vueda.core.logging_filters` or referenced the `ignore_validation_warnings` `LOGGING` filter, remove that import and filter reference._
- **Unrecognized query parameters are rejected on every route**:
    - `NoExtraFieldsForViewSetMixin.retrieve` now rejects any query parameter other than the flex-fields params (`e`, `f`, `om`) with a 400. `NoExtraFieldsForViewSetMixin.list` now applies the same rejection to a viewset with no `filterset_class`, accepting only pagination, ordering, search, and flex-fields params. Previously, `retrieve` accepted any query parameter unconditionally on every viewset, and `list` accepted any query parameter unconditionally on a viewset with no `filterset_class`; only `list` on a viewset with a `filterset_class` rejected unrecognized parameters. `list` on a viewset with a `filterset_class` is unchanged.
      _Drop any query parameter sent to a `retrieve` endpoint that is not `e`, `f`, or `om`. Drop any query parameter sent to a `list` endpoint without a filterset that is not a pagination, ordering, search, or flex-fields param (for example, a cache-busting parameter appended by a client or proxy)._

### Features

- **Ordered feature contributions**:
    - `FeatureSection` gains `contribute_order`, which sequences contributors lowest first with the section name breaking a tie. A feature that reads a model's finished field list now runs after every feature that adds one. History uses this so an event model includes fields another feature contributed.
      _No integrator action unless a project registers its own feature section. Set `contribute_order` when the order in which a contributor sees the model matters._

- **Optional workflow app boundary**:
    - Applications may omit `vueda.workflow` and `vueda.vdq` together. Model-info, ordinary CRUDL routes, history URL imports, and schema setup no longer import workflow models when workflow is absent. `vueda.vdq` still requires `vueda.workflow` and now fails early with a clear configuration error if installed without it.
      _Guard `include("vueda.workflow.urls")` and `include("vueda.vdq.urls")` behind installed-app checks, or rely on the app URL modules returning no routes when the apps are absent._
- **`class Vueda` model feature policy**:
    - A VUEDA model now declares which framework features it participates in through one nested `class Vueda`, with a section per feature (`class History`, `class Workflow`). `Meta` stays limited to Django's own model options. Read the resolved policy with `vueda.core.options.get_vueda_options(model)`, which returns every registered section with its defaults, inherited values, and overrides applied. Declarations on abstract and concrete bases reach concrete subclasses, each multi-table child resolves its own overrides, and a proxy takes the policy of its concrete model.
    - Feature apps register their own sections through `vueda.core.features.register_feature_section()`, supplying each option's default, accepted types, validation, inheritance behaviour, and whether it affects migration generation. A section may also contribute fields or behaviour to each enabled model as Django prepares it. Invalid sections are reported by system checks before their contributors run. `vueda.history` and `vueda.workflow` register the `History` and `Workflow` sections; history defaults on for eligible models when the app is installed, and workflow is opt-in. An explicit `History.exclude_fields` replaces the inherited value; extend it by including the parent entries explicitly.
    - New system checks (`vueda_core.E010`-`vueda_core.E016`) report an unknown section, a section whose feature app is not installed, an unknown option, an invalid value, an option written outside a section, a declaration on a proxy, and a declaration on a model that is not a VUEDA model.
      _The declaration is available now; the history and workflow integrations still follow the existing `VuedaHistoryModel` and `HasWorkflowModelMixin` inheritance. Until they derive from this policy, an explicit `enabled` that disagrees with a model's base classes is a check error rather than a setting that is accepted and ignored. See [Model Feature Policy](../../core-concepts/model-feature-policy.md)._
- **`expandable_fields` system check**:
    - A new Django system check (`vueda_core.E001`-`E004`) validates each serializer's `Meta.expandable_fields` at `manage.py check` time. It flags list values (flex-fields only supports tuples), malformed `(serializer, options)` tuples, serializer strings that fail to resolve, and values that are not a serializer class, tuple, or serializer string — catching misconfiguration at startup instead of on first request.
- **Read-only relation metadata (model info)**:
    - Model-info field metadata now includes `app_label` and `model` for read-only foreign-key and many-relation serializer fields when the related model can be resolved. This lets clients build relation-aware list columns without per-column fallback configuration, while still leaving `choices` disabled for read-only relation fields.
- **Display-only field labels (model info)**:
    - `VuedaExpandableFieldsSerializerMixin` and `VuedaSerializer` now support `field_display_choices`, a serializer-level mapping for display-only value labels. Model-info field metadata emits these labels as `display_choices`, separate from editable `choices`, so a boolean field can keep its toggle behavior while read-only views display labels such as `Submitted`, `-`, or `Unknown`.
      _Use `choices` for validation and editable choice widgets. Use `field_display_choices` when only read-only display needs custom labels._
- **Submit-time warning confirmation (`get_warnings`)**:
    - `VuedaSerializer` gained a non-raising `get_warnings()` hook. Override it to return advisory warnings as `{field: [messages], "non_field_errors": [messages]}`. It is called after validation succeeds, so `self.validated_data` and (on update) `self.instance` are available.
    - When `get_warnings()` returns warnings, `VuedaViewSet` withholds the create/update and responds `409 Conflict` with `{"confirmation_required": true, "digest": ..., "warnings": {...}}` instead of saving. Resubmitting with the `Acknowledge-Warnings` request header set to that `digest` lets the write proceed. A changed warning set yields a different digest and re-prompts. Blocking errors (`VuedaValidationError`) are unaffected and still return 400 before warnings are evaluated.
      _This is the recommended way to surface non-blocking, must-confirm concerns. The `acknowledge-warnings` header is added to the default `CORS_ALLOW_HEADERS`._
- **Warning confirmation for destroy, activate, deactivate, and custom actions**:
    - `WarningConfirmationMixin` (and therefore `VuedaViewSet`) gained two viewset-level hooks for writes that have no per-object serializer: `get_warnings_for_object(action, obj)` for a single object, and `get_warnings(action, objs)` for a bulk request. `action` is the action name (`"destroy"`, `"activate"`, or `"deactivate"`) for both. Override `get_warnings_for_object` to return the aggregate `{field: [messages]}` shape for `obj`; the default `get_warnings` calls it once per instance in `objs` (a queryset) and keys each non-empty result by `str(pk)`, building the per-object `{object_id: {field: [messages]}}` shape — so overriding `get_warnings_for_object` alone gates both the single-object and bulk forms of `action` with the same rule. Override `get_warnings` itself instead only when bulk needs different logic. Single-object and bulk variants are both gated: when the resolved warnings are non-empty and the request has not acknowledged them, the viewset responds `409 Conflict` with `{"confirmation_required": true, "digest": ..., "warnings": {...}}` before anything is written, the same contract as the create/update gate. Both hooks default to `{}`, so no confirmation is required unless you override one of them. Bulk gating is all-or-nothing: a 409 blocks the whole batch, and confirming runs all of it. A targetless custom action with no natural object at all has nothing for this hook pair to key by; it continues to call `gate_warnings` directly from the action body, as custom actions already do.
    - Added `vueda.core.exceptions.gate_warnings(request, warnings)`, the standalone gate that all warning-gated paths route through. Call it from a custom action body after `serializer.is_valid(raise_exception=True)` (so blocking 400s surface before the 409) and before any write or side effect; it raises `ConfirmationRequired` unless the `Acknowledge-Warnings` request header matches the warnings digest. `ACKNOWLEDGE_WARNINGS_HEADER` moved to `vueda.core.exceptions` and is re-exported from `vueda.core.decorators`, so existing imports keep working.
    - The `@action` decorator gained `confirm=True`, which declares an always-on consequence warning: the first unacknowledged mutating request returns 409 without executing the body, and resubmitting with the digest acknowledged runs it. The message comes from a `confirm_message` attribute set on the action function after its definition (`my_action.confirm_message = "..."`), falling back to "This action requires confirmation." Because this gate runs before the body, it suits input-less consequence actions; actions with input should call `gate_warnings` explicitly after validation so 400s precede the 409.
      _Warnings must be computable before the write, from the request input plus current database state; conditions discoverable only by performing the write are errors that abort the transaction, not warnings. Bulk/list-serializer create and update saves remain ungated._
- **Warning confirmation for workflow transitions (`get_transition_warnings`)**:
    - `HasWorkflowModelMixin` gained a `get_transition_warnings(transition, user=None)` hook beside `allow_transition`. Override it to return advisory warnings in the aggregate `{field: [messages]}` shape; the default returns `{}`, so no confirmation is required unless you override it.
    - `WorkflowViewSet.execute_transition` now evaluates `get_transition_warnings` before any write, for both the single-object and bulk (`object_ids`) forms, and gates through the same `gate_warnings`/`Acknowledge-Warnings` contract as create, update, destroy, activate, and deactivate: an unacknowledged warning set responds `409 Conflict` with `{"confirmation_required": true, "digest": ..., "warnings": {...}}` before the transition is applied, and resubmitting with the digest lets it proceed. A changed warning set yields a different digest and re-prompts. The `warnings` shape differs by request form: single-object is the aggregate `{field: [messages]}` mapping; bulk is `{object_id: {field: [messages]}}`, keeping each instance's own warnings mapping nested under its object id. Bulk transitions collect warnings across every instance in the batch and gate once with one digest over that combined mapping; the write remains all-or-nothing.
    - `HasWorkflowModelMixin.apply_transition` is unchanged in behavior but is now composed from two new public methods: `check_transition(transition_code, user=None)` validates permission and availability and returns `(transition, resolved_user)` without writing, and `apply_checked_transition(transition, user=None, dry_run=False)` performs the write for an already-checked transition. Transition authorization and error behavior (permission checks, `InvalidTransitionError`, locking, dry-run) are unchanged.
      _Override `get_transition_warnings` on models using `HasWorkflowModelMixin` to gate a transition behind confirmation; no action is required otherwise._
- **`ImageField` serializer field**:
    - Added `vueda.core.fields.serializers.ImageField`, the image counterpart to the existing `FileField`. It shares the `{"name", "url"}` representation and subclasses `FileField` rather than DRF's `ImageField`, so it does not require Pillow; image content validation is left to the model field and upload pipeline.
- **`updategroupmigrations` management command**:
    - Added a new management command that scans all installed apps for group migrations created by `makegroupmigrations` and rewrites their import and function sections with the current implementations from `makegroupmigrations.py`.
    - The `changed_data` variable and the `class Migration` block are preserved; only the embedded function bodies and imports are updated.
    - Accepts a `--dry-run` flag to preview which files would be changed without writing anything.
    - Run this command after any VUEDA upgrade that changes the function implementations in `makegroupmigrations.py`.
- **`updateworkflowmigrations` management command**:
    - Added a new management command that scans all installed apps for workflow migrations created by `makeworkflowmigrations` and rewrites their import and function sections with the current implementations from `makeworkflowmigrations.py`.
    - The recorded change data (`changed_data`, `history_change_reason`, `migration_app_label`) and the `class Migration` block are preserved; only the embedded function bodies, imports, and any stale function names in `operations` are updated.
    - Accepts an optional `app_label` argument to limit the update to a specific app, and a `--dry-run` flag to preview which files would be changed without writing anything.
    - Run this command after any VUEDA upgrade that changes the function implementations in `makeworkflowmigrations.py`.
- **`GenericForeignKeySerializer`**:
    - Added `GenericForeignKeySerializer` to `vueda.core.serializers` for declaring `GenericForeignKey` expandable fields. Declare it in `expandable_fields` using the `GenericForeignKey` field name as the key. The serializer resolves the concrete related model's canonical registered serializer at representation time via `get_serializer_for_model`, so every model that can appear through the generic foreign key must be registered via `register` or `register_serializer`.
    - Generic foreign key expands are always read-only. Model-info metadata for these expands reports `type_model: "GenericForeignKey"`, `type_serializer: "GenericForeignKeySerializer"`, and `type_db: null`.
    - `FIELDS_PARAM` and `OMIT_PARAM` entries in the `expandable_fields` options now support model-targeted specifiers of the form `_<app_label>__<model_name>__<field_name>`. Specifiers matching the concrete type of the related object are resolved to their bare field name before the concrete serializer is instantiated; specifiers targeting a different model are silently dropped. Plain field names and wildcards continue to apply to every related model type.
- **`get_serializer_for_model`**:
    - Added `get_serializer_for_model` to the public API of `vueda.info.registration`. Returns the canonical serializer class registered for a given model by looking up the in-process registry directly, without a database query. Returns `None` if the model is not registered. Use this when you need the registered serializer class for a model and want to avoid the `ContentType` lookup required by `get_registration`.
- **Django built-in model `formatted_name` support**:
    - `InfoConfig.ready()` now patches Django's `Group`, `Permission`, and `ContentType` models with the `_has_formatted_name_field`, `_get_formatted_name`, and `formatted_name_lookup_expression` (or `get_formatted_name`) attributes that VUEDA's viewset and serializer layers require. `Group` and `Permission` use `name` as their display field; `ContentType` uses `app_labeled_name`. All three can now be used as expandable fields without any application-level configuration.
- **`get_field_model_info()` hook (model info)**:
    - `VuedaExpandableFieldsSerializerMixin` (included in `VuedaSerializer`) gained a `get_field_model_info(fields)` hook for customizing `model_fields` metadata. It receives the generated field metadata dict, keyed by field name, and must return a dict in the same shape. Override it to correct the generated metadata for a `SerializerMethodField`, which has no model column or fixed field type to derive metadata from automatically. The default implementation applies `field_display_choices` and returns `fields`.
    - For `VuedaHistorySerializer` subclasses, this hook is also applied to the same fields as they appear embedded in the `history`, `first_history_entry`, and `last_history_entry` `model_expands` descriptors, since those embed the root model's own fields. A single override corrects the field's metadata everywhere it's reported.
    - An expand's nested serializer (the class declared in `Meta.expandable_fields`) now also has its own `get_field_model_info` applied to the field metadata embedded in that expand's descriptor, the same way it is applied to the nested serializer's own `model_fields` when it is used as a root canonical serializer. Previously, only the root serializer's `get_field_model_info` ran; a nested serializer's correction of one of its own fields did not carry over when that serializer appeared as someone else's expand.
- **OpenAPI schema reuses `model_expands`/`model_fields` generation**:
    - `get_schema_expandable_fields()` (drives the `expand` query parameter's documented values) now calls `generate_expand_model_info()` and runs the result through `get_expand_model_info()`, the same generation and customization hook the `/info/` meta-API uses for `model_expands`, instead of its own separate (and more limited) traversal of `Meta.expandable_fields`. A serializer that already overrides `get_expand_model_info` to describe a `SerializerMethodField`-backed expand no longer needs a second, schema-specific override for that.
    - Added `get_schema_fields()`, which builds this serializer's own field metadata for its OpenAPI schema the same way `model_fields` is built for `/info/` (via `ModelInfoSerializer.get_model_fields_data` and `get_field_model_info`), and now documents the `fields` query parameter's valid values in the schema, which was previously undocumented.
    - Both methods reduce the generated metadata to schema-relevant keys (`label`, `type`, `required`, `choices`), dropping the database/model type detail (`type_db`/`type_model`, with `type_serializer` renamed to `type`), the `many`/`read_only` flags, the `hidden` flag, help text, and constraint bookkeeping (`max_value`, `min_value`, `max_length`, `min_length`, `max_digits`, `decimal_places`, `pk`) that `/info/` also reports but the schema does not need. These are dropped from an expand descriptor itself as well as from its nested fields, so an expand's own `many`/`read_only` flags don't appear in the schema either.
      _Remove any custom `get_schema_expandable_fields` override that duplicated `get_expand_model_info` logic just to describe a `SerializerMethodField` expand for schema purposes; the base implementation now covers it automatically._

- **Django 6.0 and 6.1 support**:
    - The server package now accepts Django 6.0 and 6.1 in addition to 5.2 (`django>=5.2.14,<6.2`). `Model.save()` overrides in `vueda.core`, `vueda.vdq`, and `vueda.workflow` were updated for Django 6.0's keyword-only `save()` signature, and the removed `django.utils.itercompat` import was replaced with a standard-library `collections.abc.Iterable` check.
      _Django 6.0 and 6.1 both require Python 3.12+; installations on Python 3.11 continue to resolve Django 5.2 via `uv.lock`. Pin `django<6` in your own application if you need to stay on Django 5.2 while running Python 3.12 or newer, or pin `django<6.1` if you need to stay on Django 6.0._
    - The `dj-rest-auth` constraint was also raised (`dj-rest-auth>=7.0.0,<8.0`) to bring in a `dj-rest-auth` release that supports Django 6.0.
      _`dj-rest-auth` itself declares support for `django>=4.2` with no upper bound, so no action is required in your own application regardless of which supported Django version you run._
- **`MAILERS` support (Django 6.1+)**:
    - `get_defaults()` gained a `use_mailers` keyword argument. It defaults to `False`, which keeps configuring the deprecated `EMAIL_BACKEND` and `EMAIL_TIMEOUT` settings; pass `use_mailers=True` to configure Django 6.1's `MAILERS` setting instead (`MAILERS = {"default": {"BACKEND": ..., "OPTIONS": {"timeout": 5}}}`), built from the same `EMAIL_BACKEND` environment/config value.
      _`EMAIL_BACKEND` continues to work unchanged on Django 6.1, so no action is required until you choose to opt in. See Django's [MAILERS migration guide](https://docs.djangoproject.com/en/6.1/howto/mailers-migration/) before passing `use_mailers=True`, and confirm any third-party packages your project relies on (for example `django-anymail`) support `MAILERS` first._
      _`use_mailers=True` now raises `ImproperlyConfigured` on Django < 6.1 instead of returning a `MAILERS` setting those versions silently ignore (which left them running the default SMTP backend instead of the configured one). Only pass `use_mailers=True` on Django 6.1+._
- **Automatic `select_related`/`prefetch_related` for expanded fields**:
    - `VuedaViewSet.get_queryset()` now derives `select_related`/`prefetch_related` from the fields a `list` or `retrieve` request's `?e=` (expand) actually resolves, so an expanded list response no longer issues one extra query per expanded relation per row. `?f=` (sparse fields) and `?om=` (omit) do not change what gets planned: an expand named in `?e=` already renders regardless of either, so the plan follows `?e=` alone. The plan follows an expanded field's `source` (a dotted `source=` in an `expandable_fields` declaration resolves through the named relation chain, not the serializer field's own name), and recurses to the same depth the request's expansion already validated.
    - A `GenericForeignKey` expand (`GenericForeignKeySerializer`) is not planned, since it resolves its concrete serializer per-instance at representation time, after queryset planning could run; it continues to resolve lazily as before. A reverse `GenericRelation` onto a fixed, known model is a normal to-many relation and is planned like any other.
      _No action is required to adopt this; it changes query counts, not response shapes. A viewset that already applies its own `select_related`/`prefetch_related` for an expanded relation keeps serving that relation from its own lookup; the derived plan detects the overlap and defers to it rather than adding a second lookup for the same path._

### Fixes

- **Group migration generation with module-style migrations**:
    - `updategroupmigrations` failed with `AttributeError` when any installed app shipped its migrations as a single module rather than a package. Such an app is now skipped, since it has no directory a generated migration could live in.
      _No integrator action._

- **Workflow state permission query cost**:
    - `HasWorkflowModelMixin.check_state_permission` issued one query per permission string. A caller evaluating several permissions against one object paid a round trip for each. One query now resolves every codename the object's current state grants or denies, and `available_transitions` runs its whole pass inside one cached-state block.
    - Measured against `store.CustomerOrder` on the `order_fulfillment` workflow, `available_transitions` cost `8 + 4n` queries in the number of transitions leaving the current state, and now costs `6 + n`. A list response carrying `valid_transitions` for rows with three candidate transitions cost 17 queries per row and now costs 9.
    - Permission results do not move. State grants, state denies, deny-wins across conflicting groups, the no-matching-rule case, and both `RowLevelPermissions` hooks return what they returned before. `VuedaUserMixin.has_perm` remains the single authority, and a transition run through the workflow endpoint still re-reads the object's state after the row lock.
      _No integrator action. A project that called `check_state_permission` directly gets the same answer, and its signature gains only an optional `caller` argument._
- **`available_transitions_for` transition permissions**:
    - `HasWorkflowModelMixin.available_transitions_for` now applies each transition's configured `TransitionPermission` rows to the calling user. Its filter previously reached `check_transition_permission` through the model class rather than an object, which bound the transition to `self` and left `user` at `None`, so the method's first branch admitted every candidate. A caller holding the workflow's own permissions received transitions whose transition permissions they did not hold, disagreeing with the single-object `available_transitions` for the same object and user.
    - A transition is returned when the caller may take it on at least one of the given objects, matching the source-state filter, which already admits a transition leaving any of the objects' states. The method resolves the concrete instances so that workflow state grants, state denies, and `RowLevelPermissions` hooks apply per object. Passing `user=None` still returns every candidate.
      _No VUEDA endpoint calls this method. If an application called it directly and compensated for the missing filter, remove that workaround._
- **Workflow state permission deferral**:
    - Model viewsets now defer a baseline permission denial only for a state grant matching the caller's groups, action-specific codename, model content type, and workflow, and only when the request has a guaranteed later state-aware decision. Unrelated rules and state denies no longer admit list or create requests, and workflow state data no longer suppresses authentication, composite permission expressions, or additional DRF permission classes.
    - Workflow model lists now apply state grants and denies before pagination even when the model does not define `RowLevelPermissions`. A state `list_*` grant can admit the endpoint but returns only rows in matching granted states; matching denies remove rows from users with baseline list permission. Create remains model-authorized because a new object has no current workflow state.
      _If an application overrides a VUEDA list action, preserve the call to `apply_row_level_filter`. If a custom action relies on state grants to overcome a baseline denial, add the action name to `workflow_object_permission_actions` only when the action always performs an object permission check._
- **Optional VDQ notifications**:
    - Applications can now install `vueda.user` without installing `vueda.vdq`. The default user adapter sends account email through Django's configured email backend and sends two-factor authentication SMS messages directly through Twilio when VDQ is absent; applications with VDQ installed continue to queue notifications.
- **Writable nested history serializer responses**:
    - History-enabled objects created through a writable nested serializer now include their annotated `current_history_id` in the response. Nested serializers re-fetch the new object through its own model manager instead of the parent view's queryset.
- **Dependency security floor**:
    - The server package now requires `cryptography` 48.0.1 or newer and `starlette` 1.3.1 or newer so installs resolve to versions with the published security fixes.
      _No action is required unless your application pins either dependency below those versions._
- **`UserSerializer` non-mapping input**:
    - Submitting non-mapping data to `UserSerializer` on create — for example, a bare primary key sent through a writable nested or expanded user field — now returns the base serializer's standard "Expected a dictionary" DRF validation error instead of raising an unhandled `AttributeError`.
- **Sparse field requests and `formatted_name`**:
    - Requests scoped to a subset of fields via `FIELDS_PARAM`/`OMIT_PARAM` no longer reject `formatted_name` as an invalid submitted field. `formatted_name` is a virtual, model-computed field and is now always accepted regardless of the requested field subset.
- **Workflow transition check cost**:
    - `HasWorkflowModelMixin.allow_transition` now resolves only the transition it is asked about. It previously built the object's whole permitted set through `available_transitions` and tested membership, so answering about one transition ran an object-level permission evaluation for every transition leaving the current state. Its cost no longer grows with that count. `available_transitions` is unchanged and remains the way to obtain the permitted set itself.
    - `HasWorkflowModelMixin` gained `cached_workflow_state()`, a context manager that holds the object's workflow and current state for the duration of a block so one authorization pass reads them once instead of once per permission check. `check_transition` opens one per call, which keeps the post-lock re-check in `execute_transition` reading the state the lock protects. The `object_state` lookup also selects the related state in the same query.
      _Executing a single transition on the reference workflow drops from 114 queries to 57, and a two-object bulk transition from 217 to 103. Transition authorization results are unchanged._
- **Redundant `QueueItem.allow_transition` override**:
    - `vueda.vdq.models.QueueItem` no longer overrides `allow_transition`. The override duplicated the inherited implementation verbatim and would otherwise have kept VDQ on the superseded per-candidate path.
- **`permitted_transitions` for models without a workflow**:
    - `WorkflowViewSet.permitted_transitions` no longer requires `vueda_workflow.read_workflow` when the requested `app_label/model` pair has no configured workflow. A user who can read that model now gets `200` with an empty transition list instead of `403`. `read_workflow` is still required whenever a workflow is configured for the model, and every other workflow endpoint is unchanged.

## v3.0.0a0 (2026-05-27)

### Migration Summary

This is the first public-facing v3 server baseline. The major migration work is around the metadata contract,
composite primary key support, permissions/workflow tooling, more predictable REST error shapes, and generated API
documentation.

Review any application code that customizes VUEDA serializers, viewsets, filtersets, workflow/group migration
commands, password reset flows, search behavior, or model metadata consumed by the client.

### Breaking Changes

- **Object payload `available_actions`**:
    - `VuedaSerializer` now removes `available_actions` from ordinary object responses unless the sparse field request explicitly includes it.
      _Review client or integration code that read `available_actions` directly from ordinary object payloads. Request the field explicitly or use the metadata/action-contract surfaces instead._
- **Composite primary key models**:
    - Composite primary key support now uses dedicated serializer, filterset, and URL conversion behavior.
      _For composite primary key models, use VUEDA's composite primary key serializer/filterset path instead of assuming the default integer `pk` filter._
- **Password reset and error response shapes**:
    - Password reset and unhandled error responses now follow DRF-style `detail` and field-error shapes more consistently.
      _Review code that matched older `result` / `message` or `error` response keys._

### Features

- **Server version endpoint**:
    - Added documented server version metadata so the docs and client can identify which server package version they are paired with.
- **Metadata contract improvements**:
    - Serializer and model-info output now exposes more of the contract needed by the v3 client, including hidden field metadata and cleaner generated API documentation.
- **Composite primary key support**:
    - Added support for serializing, filtering, URL parsing, and documenting composite primary key models.
- **Search and filtering**:
    - Expanded `VuedaSearchFilterBackend` support for ranked search, trigram similar lookups, word-similar lookups, deterministic ordering, and distinct handling.
- **Group and workflow migration tooling**:
    - Improved group and workflow migration commands so permission and workflow changes can be captured and replayed more reliably.
- **VDQ and async dependencies**:
    - Added `channels` as a runtime dependency and updated async/background-work related server dependencies for the v3 package set.

### Fixes

- **REST error consistency**:
    - Unhandled server errors now return a `detail` key, 404 responses use a DRF-style `detail` payload, and `ImproperlyConfigured` errors are converted into client-readable validation details.
- **Forgot-password flow**:
    - Forgot-password now validates the submitted email through serializer data, returns 204 on success, returns field errors for inactive or missing users, and returns `detail` for rate limiting.
- **Ranked search distinct handling**:
    - Ranked search now preserves ordering and primary-key tie-breaking when distinct results are required.
- **Expanded history fields**:
    - History field filtering now respects wildcard field selection when applying flex-like omit/field controls to historical records.
- **Workflow permission messages**:
    - Transition attempts without permissions now return a clearer message for the client to display.
