---
title: Permissions
type: reference
audience: integrator
status: draft
---

# Permissions

## What This Controls

This page defines how authorization is enforced in VUEDA, including model-level permissions, object-level checks, row-level filtering, and workflow/state overlays.

## Permission Layers

### 1) Model-Level CRUDL Permissions

VUEDA models use CRUDL-style codenames:

- `create_<model>`
- `read_<model>`
- `update_<model>`
- `delete_<model>`
- `list_<model>`

See `vueda.core.models.BaseModelMeta` for defaults.

### 2) Object-Level Permissions

VUEDA permission classes enforce object checks for `detail` operations and dynamic action checks.

- Core object permissions: `vueda.core.permissions.ObjectPermissions`
- Workflow object permissions for dynamic workflow endpoints: `vueda.workflow.permissions.WorkflowObjectPermissions`

### 3) Row-Level Permission Filtering

`list` views can filter inaccessible rows instead of exposing everything and failing later on `detail` views.

- Instance hook: `RowLevelPermissions.check_instance(...)`; general business-rule logic; **skipped when workflow state denies**
- Queryset hook: `RowLevelPermissions.check_queryset(...)`
- Base class: `vueda.core.permissions.BaseRowLevelPermissions`
- List integration: `ListRowLevelViewSetMixin.apply_row_level_filter(...)`

### 4) Workflow/State Permission Overlay

When workflow is enabled for a model, state and transition permissions can grant/deny behavior per state and group.

- Models: `vueda.workflow.models.StatePermission`, `WorkflowPermission`, `TransitionPermission`
- Permission integration: `vueda.core.permissions.ObjectPermissions` and `vueda.workflow.permissions.WorkflowObjectPermissions`

### 5) Workflow+Row Permission Layer

Workflow-aware row-level checks that combine state context with row-level logic. Runs last and can override any prior decision, including state deny.

- Instance hook: `RowLevelPermissions.check_instance_workflow(...)`; receives `grant_or_deny` from state resolution
- Queryset hook: `RowLevelPermissions.check_queryset_workflow(...)`; queryset is pre-annotated with `_state_denied` / `_state_granted`
- Only called when the model is under workflow

## Permission Name Mapping

`PERMISSION_NAMES_MAPPING` maps Django-style names to VUEDA-style names (or vice versa for legacy integrations).

Default for new VUEDA projects:

```python
PERMISSION_NAMES_MAPPING = {
    "add": "create",
    "change": "update",
    "view": "read",
}
```

Typical mapping for existing Django projects with pre-existing `add/change/view` codenames:

```python
PERMISSION_NAMES_MAPPING = {
    "create": "add",
    "list": "view",
    "read": "view",
    "update": "change",
}
```

Related setting defaults live in `vueda.core.default_settings.get_defaults`.

## Enforcement Boundary

- Server-side permission checks are authoritative.
- Client-side UI behavior (hidden/disabled actions) are UX semantics, not authorization guarantees.
- Always expect unauthorized requests to be blocked by the server.

## Related References

- [Configuration Surface](/reference/configuration)
- [Glossary](/reference/glossary)
- [REST API](/reference/api/rest/)
