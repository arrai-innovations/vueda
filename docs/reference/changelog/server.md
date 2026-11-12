---
title: Server
type: reference
audience: integrator
status: draft
---

# Server Changelog

Integrator-facing changes for the `vueda` Python package.

Use this page for changes that affect server package consumers: Django apps, settings, serializers, viewsets, permissions, metadata responses, management commands, migrations, REST behavior, and compatibility notes.

<!-- towncrier release notes start -->

## v3.0.0b2 (2026-11-12)

### Breaking Changes

#### Forms and validation

- **`e` on writes that send nested objects** ([#682](https://github.com/arrai-innovations/vueda/issues/682)):
    - With a permit list, `e=*` on a `POST`, `PUT`, or `PATCH` now reads each permitted relation in the body as a primary key instead of a nested object, because only the first level of a name that `e` lists makes the body read that relation as a nested object. An expand-only name in the body, such as an alias with its own `source`, answers `400` instead of becoming a field of the body. A custom action that calls `is_valid()` answers `400` for an `e` name that its permit list leaves out, instead of dropping the name.
      _Name each relation that the body sends as a nested object in `e`, as in `e=customer,*`, and send a custom action only the names that its permit list holds._

#### Permissions

- **Expands of `editable=False` fields** ([#678](https://github.com/arrai-innovations/vueda/issues/678)):
    - A write that named an `editable=False` model field, or the reverse relation of one, in `e` could set the field through its expand. The expand now ignores that field's data, as the plain field already does. A create that filled a not-null `editable=False` foreign key this way now fails on insert.
      _If a form sets an `editable=False` field through its expand, set `read_only: False` in the expand's options, or set the field in server code. If inline children stop saving, check whether their foreign key to the parent has `editable=False`, and set `read_only: False` on the parent's expand of them._

#### Workflow

- **`update_object_state` takes only the state** ([#527](https://github.com/arrai-innovations/vueda/issues/527)):
    - `update_object_state(state)` no longer accepts `user` or `change_reason`. The write joins the open action, which records the acting user.
      _Remove the `user` and `change_reason` arguments from calls to `update_object_state`._
- **`workflow_state_filter` takes the model** ([#624](https://github.com/arrai-innovations/vueda/issues/624)):
    - `vueda.workflow.filtersets.workflow_state_filter(model)` now requires the model that the filterset lists, and its filter accepts only that model's workflow states. `narrow_workflow_state_filter` is removed.
      _Pass the filterset's model to `workflow_state_filter`. Remove calls to `narrow_workflow_state_filter`._

#### Models

- **`vueda_info.E016` requires `formatted_name` to come from a `CharField`** ([#538](https://github.com/arrai-innovations/vueda/issues/538)):
    - The check reports a `formatted_name` column, a `formatted_name_lookup_expression`, or the `source` of a serializer's own `formatted_name` field when it ends at a field other than a `CharField`, a `TextField` included. A generated column is judged by its `output_field`.
      _If `manage.py check` reports `vueda_info.E016`, point the lookup expression or the field's `source` at a `CharField`, give the generated column `output_field=CharField()`, or compute the name in `get_formatted_name()`._

#### VDQ

- **VDQ queue item and sent item `formatted_name` is hidden** ([#538](https://github.com/arrai-innovations/vueda/issues/538)):
    - `DefaultQueueItemSerializer` and `DefaultSentItemSerializer` now serve `formatted_name` as a hidden field, as the field that `VuedaSerializer` builds is, so the client's default lists no longer show it as a column.
      _To show it again, point `QUEUE_ITEM_SERIALIZER` or `SENT_ITEM_SERIALIZER` at a serializer that declares `formatted_name = FormattedNameField(style={"hidden": False})`._

### Features

#### Field types

- **Value filter on the field choices endpoint** ([#585](https://github.com/arrai-innovations/vueda/issues/585)):
    - `model_info_choices/<app_label>/<model>/<field>/` accepts a repeatable `value` parameter that returns only the matching options, and a related field applies it before reading any rows. A many-related `SlugRelatedField` now keys its options by the slug, as its single-valued form does, instead of by the primary key.

#### Model metadata and data loading

- **`url_path` in `model_actions`** ([#635](https://github.com/arrai-innovations/vueda/issues/635)):
    - Each extra action's entry in `model_actions` now reports `url_path`, the URL segment that the router serves the action at. The value is the `url_path` argument of `@action`, or the method name when the action sets none. [Metadata Sections](../../core-concepts/server-client-metadata-contract.md#metadata-sections) lists every key of an entry.
- **Serializer class ancestry in model info** ([#650](https://github.com/arrai-innovations/vueda/issues/650)):
    - Each `model_fields` entry, and each field entry under an expand, now has `type_serializer_ancestors`: the serializer field classes that the `type_serializer` class inherits from, nearest first. The client uses it to give a project's subclass of a stock serializer field the stock field's widget, column, and initial value. See [Customize Model Info Metadata](../../guides/customize-model-info-metadata.md).
      _A `get_field_model_info` override that changes `type_serializer` to a different class should also set `type_serializer_ancestors`, usually to an empty list._

#### History

- **`history-list` includes workflow state changes** ([#527](https://github.com/arrai-innovations/vueda/issues/527)):
    - On a workflow-enabled model, an object's history includes its workflow state changes as events with `relation: "state"`. A transition's state change and the writes of its `on_transition` hook appear as one action, labelled with the transition code, such as `approve`. A custom history view can label these events by checking for `relation: "state"`.
    - [Model History Response](../../core-concepts/model-history-response.md) describes which events the response includes and how they group.

#### Live updates

- **Websocket subscriptions (`vueda.streams`)** ([#672](https://github.com/arrai-innovations/vueda/issues/672)):
    - The `streams` extra and `get_defaults(env, use_streams=True)` add an optional websocket at `/ws/streams/` that signs in with the session cookie and tells a client when a record that it can read changes. A model opts in to change capture with `class Vueda: class Streams: enabled = True`, and `register_viewset()` lets clients subscribe to it.
    - [Set Up Websocket Subscriptions](../../guides/set-up-websocket-subscriptions.md) covers the channel layer, ASGI routing, the `object_streams_listen` process, outbox pruning, and the proxy.

### Fixes

#### Forms and validation

- **`many=True` writes through a `VuedaSerializer`** ([#682](https://github.com/arrai-innovations/vueda/issues/682)):
    - A write that validated a list of rows with `many=True`, such as one in a custom action, answered `500` once the rows' fields validated, because the extra-field check read the whole list as each row's body. Each row's check now reads that row, and a row with an unknown key answers `400` with `Invalid field.`. A row that sends a nested object still cannot be saved.
- **Wildcards and dotted names in `e` on writes** ([#682](https://github.com/arrai-innovations/vueda/issues/682)):
    - A `POST`, `PUT`, or `PATCH` checks `e` with the rules and messages of a read, and its response expands each name as a read does. Before, a write answered `400` with `Invalid expands.` for a dotted name such as `e=customer.user`, and for `e=*` or `e=~all` when the write action had no permit list.

#### Model metadata and data loading

- **`vueda_info.E014` with `register_serializer`** ([#586](https://github.com/arrai-innovations/vueda/issues/586)):
    - `manage.py check` no longer crashes with `AttributeError` when a model is registered with `register_serializer` and has no viewset. The crash also stopped `migrate` and every other command that runs the system checks. E014 now skips a registration without a viewset, because that model has no search endpoint to check.
      _If you registered a viewset that you did not need, or ran commands with `--skip-checks`, to avoid this crash, remove that workaround._
- **`model_fields` for read-only reverse relations** ([#607](https://github.com/arrai-innovations/vueda/issues/607)):
    - A read-only serializer field backed by a reverse relation now reports the related model's `app_label` and `model` in model info. It previously reported the serializer's own model. [Metadata Sections](../../core-concepts/server-client-metadata-contract.md#metadata-sections) describes these keys.
      _If your client overrides these keys or builds its own link for such a field to reach the right model, remove that workaround._
- **`model_fields` for relations that override `get_queryset()`** ([#621](https://github.com/arrai-innovations/vueda/issues/621)):
    - Model info now describes a writable relation field that overrides `get_queryset()` instead of passing `queryset`, in `model_fields` and in the fields of each `model_expands` entry. It reports `choices: true` and the related model's `app_label` and `model`, the same as a relation that passes `queryset`. Building model info for such a field previously raised an exception, so the info request failed.
      _If you passed a `queryset` to such a field or made it read-only only to keep model info working, you can remove that workaround._
- **`model_fields` for read-only choice fields** ([#636](https://github.com/arrai-innovations/vueda/issues/636)):
    - A read-only serializer field with static choices now reports its `{label, value}` list in `choices`, the same as a writable field. It previously reported `choices: false`, so read-only views showed the stored value instead of its label. [Metadata Sections](../../core-concepts/server-client-metadata-contract.md#metadata-sections) describes these keys.
      _If you set `field_display_choices` only to repeat a field's declared choices, remove that entry._
- **Model info reports a `MultipleChoiceField` as `many`** ([#650](https://github.com/arrai-innovations/vueda/issues/650)):
    - A `model_fields` entry for a `MultipleChoiceField` now has `many: true`, because the field's value is a list of choices. Over a model `ArrayField`, its `type_model` and `type_db` now name the array's base field, as they do for a `ListField`.
- **`read_only` on the expand of an `editable=False` field** ([#678](https://github.com/arrai-innovations/vueda/issues/678)):
    - A `model_expands` descriptor reports `read_only: true` when the model field that the expand writes has `editable=False`, and the expand's options set no `read_only`. An expand of a reverse relation reports it when the forward field that declares the relation has `editable=False`. A write ignores that expand's data, so the client renders its inline fieldset read-only.

#### Permissions

- **`get_allowed_extra_actions` during creates and updates** ([#634](https://github.com/arrai-innovations/vueda/issues/634)):
    - Validating a `POST`, `PUT`, or `PATCH` no longer passes the request body `dict` to `get_allowed_extra_actions` as `instance`. Before, an override that read an attribute of `instance`, as the example in [Offer Extra Actions per User or Object](../../guides/control-action-availability.md#offer-extra-actions-per-user-or-object) does, turned every create and update for the model into a `500`. A serializer that renders its `validated_data` instead of a saved object now leaves `available_actions` out of the response.
      _If you guarded `get_allowed_extra_actions` against a `dict` `instance`, remove the guard._
- **Extra actions in `model_actions` and `available_actions`** ([#673](https://github.com/arrai-innovations/vueda/issues/673)):
    - The default `get_allowed_extra_actions` on `VuedaViewSet` and `VuedaReadOnlyViewSet` now offers an extra action only when the user passes the permission classes that the action's endpoint uses. An extra action's `method_names` in `model_actions` lists only the HTTP methods that the user passes. Built-in actions in both lists are now checked against the classes that a `get_permissions` override returns for that action, as [Action Contract and Availability](../../core-concepts/action-contract-and-availability.md#model-scope-action-metadata) describes.
      _An extra action's own `permission_classes` now also run while the server builds model info and `available_actions`. Model info carries no URL kwargs, and a list response carries no `pk`, so read URL kwargs in those classes with `view.kwargs.get()`._
- **Expands of fields that a write excludes** ([#678](https://github.com/arrai-innovations/vueda/issues/678)):
    - A write that named a field in `e` could set it, even when `exclude_create_fields` or `exclude_update_fields` locked the field for that write. The expand now ignores the field's data on that write. `Meta.read_only_fields` still locks only the plain field, so a relation's rows can still be written through its expand.
      _If a form sets an excluded field through its expand, remove the field from the exclusion list._

#### Workflow

- **Transitions on models whose formatted name crosses a nullable relation** ([#603](https://github.com/arrai-innovations/vueda/issues/603)):
    - A transition now succeeds on a workflow-enabled model whose `formatted_name_lookup_expression` or `formatted_name_select_related` goes through a nullable `ForeignKey` or a reverse `OneToOneField`. Before, every transition that wasn't a dry run failed with a 500 on these models, because the row lock also tried to lock the joined related table.
- **`workflow_state` filter accepts states that no listed row is in** ([#624](https://github.com/arrai-innovations/vueda/issues/624)):
    - A list request whose `workflow_state` names a state in the model's workflow now returns 200 with the matching rows. Before, it returned 400 when none of the rows being filtered were in that state, including rows that a search had already left out. A saved list URL that names a state now keeps working after the last row leaves that state.
    - The filter now rejects a state from another model's workflow with 400. Before, it accepted one when the list had no rows.

#### Models

- **`vueda_info.W001` checks a serializer field's own `source`** ([#538](https://github.com/arrai-innovations/vueda/issues/538)):
    - The check now walks any serializer field's own `source`, even when the model has a `<field>_lookup_expression` or a `get_<field>()` method, because the field reads its `source` and not those. A serializer that passed before may now get this warning.
      _If `manage.py check` reports `vueda_info.W001`, fix the field's `source` so that it names a model field. A field that is not backed by a model field can override `get_field_model_info` instead._
- **`formatted_name_select_related` joins only for `get_formatted_name()`** ([#538](https://github.com/arrai-innovations/vueda/issues/538)):
    - Querysets and to-one expands now skip the declared joins on a model with no `get_formatted_name()` method, or one with a lookup expression. Nothing read the joined rows there, so the joins only slowed the query down.
      _A project that declared `formatted_name_select_related` to join a relation for some other purpose must call `select_related()` on its own querysets instead._
- **`VuedaSerializer` builds `formatted_name` for every model** ([#538](https://github.com/arrai-innovations/vueda/issues/538)):
    - Serializers of `get_formatted_name()` models no longer need a `formatted_name = serializers.SerializerMethodField()` declaration, and no longer return `null` without one. An instance loaded without the lookup-expression annotation, such as one returned from a create, now gets its label too. After an update, the label follows the lookup expression on the updated row instead of the annotation that was read before the write.
- **Nested expands under a viewset's own `Prefetch`** ([#546](https://github.com/arrai-innovations/vueda/issues/546)):
    - A nested expand now keeps its query plan when the viewset prefetches the relation with a `Prefetch` queryset of its own, so the nested relation loads in one query instead of one query per row. A nested model with a `formatted_name_lookup_expression` returns its name instead of `null`, and the viewset's `Prefetch` no longer needs `_base_manager` to avoid that `null`. [Query Cost of List and Retrieve Expansion](../../core-concepts/field-and-expand-semantics.md#query-cost-of-list-and-retrieve-expansion) describes which viewset prefetches this covers.

#### Setup and dependencies

- **psycopg dependency and install command** ([#560](https://github.com/arrai-innovations/vueda/issues/560)):
    - `vueda` now declares psycopg 3 as a dependency, because VUEDA imports it when Django loads its settings. Without a driver, a project failed at startup with `No module named 'psycopg2'`. The install command now selects the prerelease with a version range, so no other package resolves to a prerelease.
      _Add VUEDA with `uv add "vueda>=3.0.0b2,<4" "psycopg[binary]"`, or use `psycopg[c]` for a build compiled against the system client library._
- **Sentry reporting from `debug_stack_exception_handler`** ([#613](https://github.com/arrai-innovations/vueda/issues/613), [#623](https://github.com/arrai-innovations/vueda/issues/623)):
    - `debug_stack_exception_handler` now sends Sentry one event for each exception that it answers with a 5xx status, such as a `RuntimeError`, an `ImproperlyConfigured`, or a bare `APIException`, and Sentry marks the event as unhandled, as it marks a 500 from a plain Django view. Before, Sentry received no event for these errors. The handler sends no event for a 4xx response, such as a validation, permission, or confirmation error, where it sent validation errors before.
      _Expect new Sentry issues for API errors that went unreported before, and review alert rules that count unhandled errors. Move alerts that rely on Sentry events for validation errors to another signal._

## v3.0.0b1 (2026-10-21)

This is the first public beta of the VUEDA v3 server. It adds REST endpoints, permissions, metadata, history, and workflow to a Django project, and the VUEDA client builds its screens from that metadata. A project on server v2.3.3 upgrades with [Upgrade from VUEDA v2](../../guides/upgrade-from-v2.md), which also covers the matching client upgrade. That guide lists v2 security defects that may need a review of existing data.

### Installation and Requirements

Install the beta from the public PyPI index. Prereleases need an explicit opt-in:

```bash
uv add --prerelease allow vueda
```

The server requires:

- Python 3.12 to 3.14.
- Django 6.1 and Django REST framework 3.18 or later.
- PostgreSQL. History uses database triggers.
- A cache that every worker process shares, named by `CACHE_URL`. Install the `redis` extra for a Redis cache. [Configure the Cache and Sessions](../../guides/configure-cache-and-sessions.md) describes the choices.

`get_defaults()` builds the Django settings from your environment. [Configuration Reference](../configuration.md) lists every key that it reads.

### Capabilities

- **History.** Every VUEDA model records its changes through database triggers unless it opts out. History responses group events by the user action that caused them, and `audited_action` groups writes outside a request. [History and Workflow](../../core-concepts/model-feature-policy.md#history-and-workflow) describes the policy, and [Purge Model History Rows](../../guides/purge-model-history.md) covers retention.
- **Workflow.** A model opts into workflow with `class Vueda.Workflow`. State permissions layer over model permissions, and transitions can ask the user to confirm warnings. [Workflow Permission Overlay](../../core-concepts/workflow-permission-overlay.md) describes the rules, and [Manage Workflows and Generate Workflow Migrations](../../guides/manage-workflows.md) covers the tooling.
- **Write confirmation.** Serializers, viewsets, and custom actions return warnings that the client confirms before the write. [Require Confirmation Before a Write](../../guides/require-write-confirmation.md) covers each hook.
- **Ordering and filtering.** Ordering and filter names cross relations with dots. A model can place nulls in requested sorts, order by a database function by default, and order or filter by a related `formatted_name`. Ordering, filter, and column total paths may end in a transform, such as `created__year`. Model info reports the default ordering. [Declare List Ordering](../../guides/declare-list-ordering.md) shows each option.
- **Column totals.** A list response sums the columns that the request asks for. [Expose Aggregates in `list` Responses](../../guides/list-column-totals.md) describes the contract.
- **Composite primary keys.** Models with a composite primary key get list, detail, and write endpoints. [Set Up CRUD for a Composite Primary Key Model](../../guides/composite-primary-keys.md) shows the setup.
- **File fields.** File and image columns serialize as `{name, url}`. A `blank=True` column accepts `null`, which saves no file or clears the stored one. Saves that carry files go as multipart with a manifest.
- **Nested writes.** Nested writes check the related model's permissions, keep child rows under their own parent, and accept files at any depth. [Nested Write Compatibility](../../core-concepts/nested-write-compatibility.md) describes the contract.
- **Auth endpoints.** VUEDA routes forgot-password, reset-password, and two-factor reauthentication, and rate-limits code sends and password attempts. [Rate-Limited Auth Endpoints](../../guides/configure-cache-and-sessions.md#rate-limited-auth-endpoints) lists the limits.
- **Optional apps.** A project can leave out `vueda.workflow` and `vueda.vdq`. [Django App Boundaries](../../core-concepts/architecture-overview.md#django-app-boundaries) describes what each app adds.
- **VDQ tracking.** The VDQ queue matches provider status updates to queue items that have no stored provider ID. [VDQ and Background Work Model](../../core-concepts/vdq-and-background-work.md) describes the matching.
- **System checks.** `manage.py check` reports configuration that would fail at request time, such as orderings that name no field and column totals that cannot be summed.

### Known Limitations

- An upgrade from v2 does not convert django-simple-history records into v3 history ([#511](https://github.com/arrai-innovations/vueda/issues/511)). Archive the `Historical*` tables before you migrate.
- `updateworkflowmigrations` cannot rewrite workflow migrations that v2 generated. The reverse code of those migrations deletes the object states of every workflow ([#510](https://github.com/arrai-innovations/vueda/issues/510)).
- A write can link any related row whose primary key the user knows. The link ignores row-level rules on the related model ([#466](https://github.com/arrai-innovations/vueda/issues/466)).
- A nested row drops an unknown key without an error ([#424](https://github.com/arrai-innovations/vueda/issues/424)).
- Choice endpoints return the first 200 rows and have no search ([#381](https://github.com/arrai-innovations/vueda/issues/381)).
- The permissions overview cannot delete a group ([#423](https://github.com/arrai-innovations/vueda/issues/423)).
- A workflow cannot be retired from a model that has objects ([#431](https://github.com/arrai-innovations/vueda/issues/431)).
- Object transition lists ignore `allow_transition` overrides, so the client can offer a transition that fails ([#430](https://github.com/arrai-innovations/vueda/issues/430)).
- A VDQ queue item stays in `queued` or `sending` when its worker stops mid-task ([#436](https://github.com/arrai-innovations/vueda/issues/436)).
- Any signed-in user can download any VDQ email attachment by its ID. [Known Limitations](../../guides/vdq-email-anymail.md#known-limitations) describes the boundary.

## Public Baseline

VUEDA server versions before v3.0.0b1 were private releases or prereleases. This page starts the public history at v3.0.0b1.
