---
title: Map Django and VUEDA Permission Names
type: how-to
audience: implementor
status: draft
---

# Map Django and VUEDA Permission Names

This guide covers the end-to-end flow for configuring VUEDA's permission codename mapping; the mechanism that translates between Django's built-in permission names (`add`, `change`, `view`) and VUEDA's CRUDL names (`create`, `update`, `read`). The mapping affects permission generation during migrations, runtime permission checks across all server layers, and the codenames stored in `auth_permission` rows. Getting this right at project setup prevents codename mismatches that surface as unexpected `403` responses or missing permissions.

The guide assumes familiarity with the permission model. If you have not read [Permission Model](../core-concepts/permission-model), start there; it explains the layered evaluation that consumes these codenames. For the boundary between server authorization and client UI semantics, see [Authorization vs UI Semantics](../core-concepts/authorization-vs-ui-semantics).

## Goal and Preconditions

The objective is a project where:

- Permission codenames in `auth_permission` match the names used by runtime permission checks.
- `ObjectPermissions` maps HTTP methods to the correct codenames for the chosen mapping direction.
- Runtime paths that build codenames directly from `PERMISSION_NAMES_MAPPING` (model-info, history, workflow, row-level filtering) resolve consistently.
- Tests exercise the mapped codenames and confirm expected allow/deny outcomes.

Before you begin, ensure the following are in place:

The project has a Django settings module that calls `get_defaults` from `vueda.core.default_settings` or otherwise defines `PERMISSION_NAMES_MAPPING`. The default mapping is `{"add": "create", "change": "update", "view": "read"}`; this is the standard VUEDA configuration and what VUEDA's own tests exercise. If you started from a VUEDA project template, this is already set up in your base settings (see `templates/implementor-monorepo/server/config/settings/base.py.jinja` for the reference implementation).

## Choose Mapping Direction

`PERMISSION_NAMES_MAPPING` is a dictionary that maps Django's built-in action names to the codename strings used in `auth_permission` rows and runtime checks. The mapping runs through Django's `get_permission_codename` function, which VUEDA monkey-patches to apply the translation.

The default mapping translates Django's vocabulary to CRUDL:

| Django action | VUEDA codename | Example for `myapp.Widget` |
| ------------- | -------------- | -------------------------- |
| `add`         | `create`       | `myapp.create_widget`      |
| `change`      | `update`       | `myapp.update_widget`      |
| `view`        | `read`         | `myapp.read_widget`        |
| `delete`      | (unchanged)    | `myapp.delete_widget`      |

`delete` is not in the mapping because the codename does not change.

`list` is an additional VUEDA permission declared in `BaseModelMeta.default_permissions` and is not part of the mapping; it is generated directly as `list_*` by the base model meta.

If your project needs to use the opposite mapping direction (such as mapping VUEDA names back to Django names for compatibility with third-party apps that expect `add`, `change`, or `view`), set `PERMISSION_NAMES_MAPPING` to match that need. Be aware that reverse mappings activate a code path in `patch_django` that rewrites the `perms_map` on `ObjectPermissions` and `WorkflowObjectPermissions`. This ensures HTTP-method-to-codename resolution stays consistent with the mapping, but it also means the `perms_map` at runtime may differ from what the source code declares. Validate explicitly if you use a non-default mapping.

The mapping must be decided before Django generates permission rows. Once `migrate` runs, the codenames in `auth_permission` are set. Changing the mapping after initial migration does not automatically update existing permission rows or group assignments.

## Set Mapping and Patch Import Order

The `patch_django` module applies the mapping by monkey-patching two Django internals: `auth.get_permission_codename` (used at runtime to resolve codenames) and `management._get_builtin_permissions` (used during migration to generate permission rows). The patch reads `PERMISSION_NAMES_MAPPING` from settings at import time, so the mapping must be finalized in settings before the patch module is imported.

If you started from a VUEDA project template, the patch import is already in your base settings:

```python
# This needs to be imported after any customizations to the PERMISSION_NAMES_MAPPING, so
# all permission names can be mapped to the correct names before django starts using them.
from vueda.core import patch_django  # noqa F401
```

If you are setting up a project manually, place this import in your base settings module after `PERMISSION_NAMES_MAPPING` is defined. The import must execute at every runtime entry point that generates or uses permissions: the server process, the test runner, and the migration environment.

Import order matters. If you override `PERMISSION_NAMES_MAPPING` in an environment-specific settings file (for example, `local.py` importing from `base.py` via `from config.settings.base import *`), the override happens after the base module's patch import. At that point, the patch has already captured the base mapping. Either move the mapping override before the patch import, or re-import `patch_django` after the override.

`patch_django` is not auto-imported by `vueda.core`. An explicit import is required. If the import is missing, no monkey-patch is applied: Django generates `add_*/change_*/view_*` codenames, but runtime checks look for `create_*/update_*/read_*` codenames, and every permission check fails.

## Validate Generated Permission Codenames

After running migrations, verify that the generated codenames match expectations. The `auth_permission` table should contain rows with codenames in the mapped vocabulary.

For a model `myapp.Widget` with default VUEDA mapping, expect these codenames: `create_widget`, `read_widget`, `update_widget`, `delete_widget`, `list_widget`.

The `get_builtin_permissions` patch includes deduplication logic. If the mapping collapses two actions to the same codename (for example, mapping both `list` and `view` to the same name), the patch skips the duplicate to avoid a unique constraint violation during `create_permissions`. Verify that the expected number of permission rows exists for each model.

## Validate Runtime Permission Checks

Several runtime paths build codenames directly from `PERMISSION_NAMES_MAPPING` rather than going through the DRF permission class. These paths must resolve to the same codenames as in `auth_permission`.

**CRUDL HTTP-method checks.** `ObjectPermissions.perms_map` maps HTTP methods to codename patterns. With the default mapping, `GET` resolves to `list_*` or `read_*`, `POST` to `create_*`, `PUT`/`PATCH` to `update_*`, `DELETE` to `delete_*`. With a reverse mapping, the patch rewrites `perms_map` entries to use the reversed names. Verify by making authenticated requests for each HTTP method and checking that the expected permission is required.

**Row-level `list` filtering.** `ListRowLevelViewSetMixin.apply_row_level_filter` builds the `perm_type` by extracting the action prefix from the full codename. The prefix must match the mapping's output.

**Model-info choice and filter-choice endpoints.** These endpoints check `list` and `read` permissions using codenames derived from the mapping. A user without the mapped `read` codename cannot access field choices; a user without the mapped `list` codename on a related model cannot access related-model choices.

**Object history endpoint.** The history view checks the mapped `read` codename before returning history data.

**Workflow object-state endpoint.** The workflow `object_state` view checks the mapped `read` codename for the target instance.

## Verification Matrix

Validate the mapping end-to-end by running a permission matrix. For each HTTP method and endpoint type, test with a user who holds only one CRUDL codename at a time.

| Test scenario         | Expected codename             | Expected outcome                            |
| --------------------- | ----------------------------- | ------------------------------------------- |
| `GET` list            | `list_*`                      | `200` if held, `403` if not                 |
| `GET` detail          | `read_*`                      | `200` if held, `403` if not                 |
| `POST` create         | `create_*`                    | `201` if held, `403` if not                 |
| `PUT`/`PATCH` update  | `update_*`                    | `200` if held, `403` if not                 |
| `DELETE`              | `delete_*`                    | `204` if held, `403` if not                 |
| Field choices         | `read_*` (source model)       | `200` if held, `403` if not                 |
| Related-model choices | `read_*` + `list_*` (related) | `200` if both held, `403` if either missing |
| Filter choices        | `read_*` (source model)       | `200` if held, `403` if not                 |
| Object history        | `read_*`                      | `200` if held, `403` if not                 |
| Workflow object state | `read_*`                      | `200` if held, `403` if not                 |

VUEDA's own test suite exercises the default CRUDL mapping. If you use a non-default mapping, add project-level tests that cover the above matrix with your mapped codenames.

## Troubleshooting

**Every permission check fails with `403`.** The `patch_django` import is missing. Runtime checks look for `create_*/read_*/update_*` codenames, but Django generated `add_*/view_*/change_*` codenames (or vice versa). Verify the import is present and executes before any permission check runs. Check all entrypoints: server, tests, and management commands.

**Permissions work in the server but fail in tests.** The test settings module does not import `patch_django`, or imports it before `PERMISSION_NAMES_MAPPING` is defined. Verify that the test settings follow the same import order as the server settings.

**`perms_map` at runtime does not match the source code.** If a reverse mapping is active, `patch_django` rewrites `perms_map` entries on `ObjectPermissions` and `WorkflowObjectPermissions` at import time. The runtime `perms_map` reflects the patched values, not the values declared in the class definition. Inspect the runtime value with a debugger or print statement if the behaviour does not match expectations.

**Changing the mapping after initial migration has no effect on existing permissions.** `PERMISSION_NAMES_MAPPING` affects codename generation during migration and codename resolution at runtime. Changing the mapping updates both sides, but existing `auth_permission` rows retain their original codenames. If you need to change the mapping on an existing project, the permission rows and any group assignments must be updated to match.

**`list` vs `view` codename collapse.** If the mapping causes `list` and `view` to resolve to the same codename, the deduplication in `get_builtin_permissions` prevents duplicate permission rows. But the `GET` list and `GET` detail will then require the same codename, eliminating the ability to grant list access without detail-read access. Validate the list and detail behaviour separately.

**Hardcoded permission strings bypass the mapping.** Any project code that uses literal codename strings (such as `user.has_perm("myapp.view_widget")`) bypasses the mapping entirely. These strings must be manually audited and updated if the mapping changes.

## Relevant Implementation Surface

- Python:
    - {@api py:function:vueda.core.default_settings.get_defaults}
    - {@api py:module:vueda.core.patch_django}
    - {@api py:function:vueda.core.patch_django.get_permission_codename}
    - {@api py:function:vueda.core.patch_django.get_builtin_permissions}
    - {@api py:property:vueda.core.patch_django.permission_names_mapping}
    - {@api py:class:vueda.core.permissions.ObjectPermissions}
    - {@api py:property:vueda.core.permissions.ObjectPermissions.perms_map}
    - {@api py:function:vueda.user.mixins.VUEDAPermissionsMixin.has_perm}
    - {@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.apply_row_level_filter}
    - {@api py:function:vueda.info.viewsets.ModelInfoChoicesViewSet.get_queryset}
    - {@api py:function:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet.get_queryset}
    - {@api py:function:vueda.history.views.GetObjectHistoryView.get}
    - {@api py:function:vueda.workflow.viewsets.WorkflowViewSet.object_state}
    - {@api py:property:vueda.workflow.permissions.WorkflowObjectPermissions.perms_map}
- REST:
    - {@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/}
    - {@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}
    - {@api rest:endpoint:GET:/object-history/{app_label}/{model}/{object_id}/}
    - {@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-state/{object_id}/}
