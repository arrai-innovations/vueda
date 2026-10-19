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

## v3.0.0b1 (unreleased)

This is the first public beta of the VUEDA v3 server. It adds REST endpoints, permissions, metadata, history, and workflow to a Django project, and the VUEDA client builds its screens from that metadata. A project on server v2.3.3 upgrades with [Upgrade from VUEDA v2](../../guides/upgrade-from-v2.md), which also covers the matching client upgrade. That guide lists v2 security defects that may need a review of existing data.

### Installation and Requirements

Install the beta from the public PyPI index. Prereleases need an explicit opt-in:

```bash
uv add --prerelease allow vueda
```

The server requires:

- Python 3.12 to 3.14.
- Django 6.1 and Django REST framework 3.16 or later.
- PostgreSQL. History uses database triggers.
- A cache that every worker process shares, named by `CACHE_URL`. Install the `redis` extra for a Redis cache. [Configure the Cache and Sessions](../../guides/configure-cache-and-sessions.md) describes the choices.

`get_defaults()` builds the Django settings from your environment. [Configuration Reference](../configuration.md) lists every key that it reads.

### Capabilities

- **History.** Every VUEDA model records its changes through database triggers unless it opts out. History responses group events by the user action that caused them, and `audited_action` groups writes outside a request. [History and Workflow](../../core-concepts/model-feature-policy.md#history-and-workflow) describes the policy, and [Purge Model History Rows](../../guides/purge-model-history.md) covers retention.
- **Workflow.** A model opts into workflow with `class Vueda.Workflow`. State permissions layer over model permissions, and transitions can ask the user to confirm warnings. [Workflow Permission Overlay](../../core-concepts/workflow-permission-overlay.md) describes the rules, and [Manage Workflows and Generate Workflow Migrations](../../guides/manage-workflows.md) covers the tooling.
- **Write confirmation.** Serializers, viewsets, and custom actions return warnings that the client confirms before the write. [Require Confirmation Before a Write](../../guides/require-write-confirmation.md) covers each hook.
- **Ordering and filtering.** Ordering and filter names cross relations with dots. A model can place nulls in requested sorts, order by a database function by default, and order or filter by a related `formatted_name`. Model info reports the default ordering. [Declare List Ordering](../../guides/declare-list-ordering.md) shows each option.
- **Column totals.** A list response sums the columns that the request asks for. [Expose Aggregates in `list` Responses](../../guides/list-column-totals.md) describes the contract.
- **Composite primary keys.** Models with a composite primary key get list, detail, and write endpoints. [Set Up CRUD for a Composite Primary Key Model](../../guides/composite-primary-keys.md) shows the setup.
- **Nested writes.** Nested writes check the related model's permissions, keep child rows under their own parent, and accept files at any depth. [Nested Write Compatibility](../../core-concepts/nested-write-compatibility.md) describes the contract.
- **Auth endpoints.** VUEDA routes forgot-password, reset-password, and two-factor reauthentication, and rate-limits code sends and password attempts. [Rate-Limited Auth Endpoints](../../guides/configure-cache-and-sessions.md#rate-limited-auth-endpoints) lists the limits.
- **Optional apps.** A project can leave out `vueda.workflow` and `vueda.vdq`. [Django App Boundaries](../../core-concepts/architecture-overview.md#django-app-boundaries) describes what each app adds.
- **VDQ tracking.** The VDQ queue matches provider status updates to queue items that have no stored provider ID. [VDQ and Background Work Model](../../core-concepts/vdq-and-background-work.md) describes the matching.
- **System checks.** `manage.py check` reports configuration that would fail at request time, such as orderings that name no field and column totals that cannot be summed.

### Known Limitations

- An upgrade from v2 does not convert django-simple-history records into v3 history ([#511](https://github.com/arrai-innovations/vueda/issues/511)). Archive the `Historical*` tables before you migrate.
- `updateworkflowmigrations` cannot rewrite workflow migrations that v2 generated. The reverse code of those migrations deletes the object states of every workflow ([#510](https://github.com/arrai-innovations/vueda/issues/510)).
- Ordering and column total paths that end in a transform, such as `created__year`, fail the system checks ([#494](https://github.com/arrai-innovations/vueda/issues/494)).
- Bulk delete, activate, and deactivate accept only integer primary keys ([#422](https://github.com/arrai-innovations/vueda/issues/422)).
- A write can link any related row whose primary key the user knows. The link ignores row-level rules on the related model ([#466](https://github.com/arrai-innovations/vueda/issues/466)).
- Write actions do not validate the names in `f`. A misspelled name returns a partial object without an error ([#395](https://github.com/arrai-innovations/vueda/issues/395)).
- A nested row drops an unknown key without an error ([#424](https://github.com/arrai-innovations/vueda/issues/424)).
- Choice endpoints return the first 200 rows and have no search ([#381](https://github.com/arrai-innovations/vueda/issues/381)).
- The checks for `formatted_name` managers cover only the default manager of registered models ([#259](https://github.com/arrai-innovations/vueda/issues/259), [#496](https://github.com/arrai-innovations/vueda/issues/496)). A missed manager fails at query time.
- The permissions overview cannot delete a group ([#423](https://github.com/arrai-innovations/vueda/issues/423)).
- A workflow cannot be retired from a model that has objects ([#431](https://github.com/arrai-innovations/vueda/issues/431)).
- Object transition lists ignore `allow_transition` overrides, so the client can offer a transition that fails ([#430](https://github.com/arrai-innovations/vueda/issues/430)).
- A VDQ queue item stays in `queued` or `sending` when its worker stops mid-task ([#436](https://github.com/arrai-innovations/vueda/issues/436)).
- Any signed-in user can download any VDQ email attachment by its ID. [Known Limitations](../../guides/vdq-email-anymail.md#known-limitations) describes the boundary.

## Public Baseline

VUEDA server versions before v3.0.0b1 were private releases or prereleases. This page starts the public history at v3.0.0b1.
