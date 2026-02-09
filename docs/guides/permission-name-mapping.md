---
title: Map Django and VUEDA Permission Names
type: how-to
audience: implementor
status: briefing
---

# Map Django and VUEDA Permission Names

## Intent and Scope

- Configure one permission-codename mapping strategy so permission creation and runtime checks stay aligned.
- Cover the implementation points that read `PERMISSION_NAMES_MAPPING` directly or indirectly.
- Treat this as a scoping brief for implementation and verification, not final prose.
- Source anchors: `server/vueda/core/default_settings.py`, `server/vueda/core/patch_django.py`, `server/vueda/core/permissions.py`, `server/vueda/user/mixins.py`.

## Non-goals

- Not a full migration playbook for existing permission rows and group assignments.
- Not an architectural explanation of the full VUEDA permission stack.
- Not a guarantee that non-default mappings are fully covered by automated tests in this repo.
- Source anchors: `server/tests/unit/core/test_permissions.py`, `server/tests/settings.py`.

## Key Tasks

### 1. Choose mapping direction before Django permission generation runs

- Set `PERMISSION_NAMES_MAPPING` deliberately (default maps Django `add/change/view` to VUEDA `create/update/read`).
- Keep `list` semantics in scope when deciding legacy mappings.
- Source anchors: `server/vueda/core/default_settings.py`, `server/vueda/core/models.py`.

### 2. Patch Django after mapping is finalized in settings

- Import `from vueda.core import patch_django` after any mapping override.
- For projects generated from current VUEDA templates, keep this patch import in base settings unless you move patching to an equivalent final-settings hook.
- Confirm this import happens in every runtime entrypoint that generates/uses permissions (tests, server process, migrations environment).
- Source anchors: `server/tests/settings.py`, `server/vueda/core/patch_django.py`, `server/vueda/core/__init__.py`, `templates/implementor-monorepo/server/config/settings/base.py.jinja`, `templates/implementor-monorepo-dx/server/config/settings/base.py.jinja`.

### 3. Validate patch behavior against your mapping mode

- Confirm `auth.get_permission_codename` is remapped through `permission_names_mapping`.
- Confirm `management._get_builtin_permissions` uses mapped names and deduplicates collisions.
- If reverse mapping is used (e.g., values include `add/change/view`), confirm `ObjectPermissions.perms_map` and `WorkflowObjectPermissions.perms_map` are rewritten accordingly.
- Source anchors: `server/vueda/core/patch_django.py`, `server/vueda/core/permissions.py`, `server/vueda/workflow/permissions.py`.

### 4. Verify mapped names across runtime permission checks

- Verify CRUDL HTTP-method checks still resolve expected codenames through `ObjectPermissions`.
- Verify direct mapped-name checks in row-level list filtering, model-info choices/filter-choice endpoints, object history, and workflow object-state endpoint.
- Source anchors: `server/vueda/core/permissions.py`, `server/vueda/core/viewsets/__init__.py`, `server/vueda/info/viewsets.py`, `server/vueda/history/views.py`, `server/vueda/workflow/viewsets.py`.

### 5. Run a permission matrix for allowed and denied cases

- Validate `GET` detail, `GET` list, `POST`, `PUT`/`PATCH`, and `DELETE` with users holding only one action codename at a time.
- Validate model-info/choices/filter-choices behavior for users missing related `list`/`read` permissions.
- Source anchors: `server/tests/unit/core/test_permissions.py`, `server/tests/unit/info/test_model_info.py`, `server/tests/unit/info/test_model_info_choices.py`, `server/tests/unit/info/test_model_info_filterset_choices.py`.

## Relevant Implementation Surface

- Python:
- `{@api py:function:vueda.core.default_settings.get_defaults}`
- `{@api py:module:vueda.core.patch_django}`
- `{@api py:function:vueda.core.patch_django.get_permission_codename}`
- `{@api py:function:vueda.core.patch_django.get_builtin_permissions}`
- `{@api py:property:vueda.core.patch_django.permission_names_mapping}`
- `{@api py:class:vueda.core.permissions.ObjectPermissions}`
- `{@api py:property:vueda.core.permissions.ObjectPermissions.perms_map}`
- `{@api py:function:vueda.user.mixins.VUEDAPermissionsMixin.has_perm}`
- `{@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.apply_row_level_filter}`
- `{@api py:function:vueda.info.viewsets.ModelInfoChoicesViewSet.get_queryset}`
- `{@api py:function:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet.get_queryset}`
- `{@api py:function:vueda.history.views.GetObjectHistoryView.get}`
- `{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.object_state}`
- `{@api py:property:vueda.workflow.permissions.WorkflowObjectPermissions.perms_map}`
- REST:
- `{@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/}`
- `{@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}`
- `{@api rest:endpoint:GET:/object-history/{app_label}/{model}/{object_id}/}`
- `{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-state/{object_id}/}`

## Contracts and Invariants

- Default settings map `add -> create`, `change -> update`, and `view -> read`.
- Default model permission set includes `create/read/update/delete/list`.
- Patch module overrides Django codename generation and built-in permission generation using `PERMISSION_NAMES_MAPPING`.
- Patch module avoids duplicate generated permissions when mappings collapse names (for example, `list` and `view` to same codename).
- Reverse-mapping branches can rewrite HTTP-method permission maps for both core object permissions and workflow object permissions.
- Several runtime checks build codenames directly from `PERMISSION_NAMES_MAPPING` (`read`/`list` in info/history/workflow/row-level paths), so mapping consistency must be end-to-end.
- Current project templates apply `patch_django` in base settings by default.
- Source anchors: `server/vueda/core/default_settings.py`, `server/vueda/core/models.py`, `server/vueda/core/patch_django.py`, `server/vueda/core/permissions.py`, `server/vueda/workflow/permissions.py`, `server/vueda/core/viewsets/__init__.py`, `server/vueda/info/viewsets.py`, `server/vueda/history/views.py`, `server/vueda/workflow/viewsets.py`, `templates/implementor-monorepo/server/config/settings/base.py.jinja`, `templates/implementor-monorepo-dx/server/config/settings/base.py.jinja`.

## Footguns

- `patch_django` is not auto-imported by `vueda.core`; missing explicit import means no monkey-patch is applied.
- Import order matters: importing patch before final mapping overrides can lock in wrong names for generation/runtime.
- In generated projects, overriding `PERMISSION_NAMES_MAPPING` in env-specific settings (for example `local.py`) after `from config.settings.base import *` will happen after base patching; re-apply patch or move override earlier.
- Reverse mapping can collapse list/read to one Django codename (`view`) via `perms_map` rewrites; validate list vs detail behavior explicitly.
- Hardcoded permission strings in project/view code bypass mapping intent and must be audited manually.
- Non-default mapping branches are code-supported, but this repo’s unit tests primarily exercise default CRUDL naming.
- Source anchors: `server/vueda/core/__init__.py`, `server/tests/settings.py`, `server/vueda/core/patch_django.py`, `server/vueda/core/permissions.py`, `server/tests/store/viewsets.py`, `server/tests/unit/core/test_permissions.py`, `templates/implementor-monorepo/server/config/settings/local.py.jinja`, `templates/implementor-monorepo-dx/server/config/settings/local.py.jinja`.

## Suggested Outline

```md
## Goal and Preconditions
## Choose Mapping Direction
## Set Mapping and Patch Import Order
## Validate Generated Permission Codenames
## Validate Runtime Permission Checks
## Verification Matrix (Allowed/Denied)
## Troubleshooting and Known Gaps
```
