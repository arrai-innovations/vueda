---
title: Permissions
type: reference
audience: integrator
status: draft
---

# Permissions

This page lists the permission codenames VUEDA checks and the codename each request requires. It also lists the {@term Row-Level Permissions} hook signatures, the status code for each refused request, and the supported {@term Permission Mapping} values. [Permission Model](../core-concepts/permission-model) describes the {@term Permission Layers} and why each refusal takes the form it does. Every check on this page is server enforcement. [Authorization vs UI Semantics](../core-concepts/authorization-vs-ui-semantics) describes how the client's visible actions relate to it.

## Codenames

VUEDA models declare five actions in [`default_permissions`]{@api py:property:vueda.core.models.BaseModelMeta.default_permissions}. Importing {@api py:module:vueda.core.patch_django} adds `list` to every other model whose `Meta` does not declare its own `default_permissions`.

Each codename takes the form `<app_label>.<action>_<model_name>`.

| Action   | Codename for `myapp.Widget` | Grants                                      |
| -------- | --------------------------- | ------------------------------------------- |
| `create` | `myapp.create_widget`       | `POST` to the list route                    |
| `read`   | `myapp.read_widget`         | Retrieve, and `GET` on any extra action     |
| `update` | `myapp.update_widget`       | `PUT` and `PATCH`                           |
| `delete` | `myapp.delete_widget`       | Single-object `DELETE` and bulk delete      |
| `list`   | `myapp.list_widget`         | `GET` on the list route (the `list` action) |

The table uses the default mapping. Under Django's names, the codenames change as [Permission Name Mapping](#permission-name-mapping) lists.

## Required Codename per Request

A permission class maps each request method to a codename. [`ObjectPermissions`]{@api py:class:vueda.core.permissions.ObjectPermissions} is the default class for VUEDA viewsets, and its [`perms_map`]{@api py:property:vueda.core.permissions.ObjectPermissions.perms_map} holds the mapping.

| Method            | `ObjectPermissions`, default mapping                          | `ObjectPermissions`, Django's names |
| ----------------- | ------------------------------------------------------------- | ----------------------------------- |
| `GET`             | `list_` for the `list` action; `read_` for every other action | `view_` for every action            |
| `POST`            | `create_`                                                     | `add_`                              |
| `PUT`, `PATCH`    | `update_`                                                     | `change_`                           |
| `DELETE`          | `delete_`                                                     | `delete_`                           |
| `HEAD`, `OPTIONS` | None                                                          | None                                |

Endpoints that name their model in the URL use [`DynamicObjectPermissions`]{@api py:class:vueda.core.permissions.DynamicObjectPermissions} or its subclass [`WorkflowObjectPermissions`]{@api py:class:vueda.workflow.permissions.WorkflowObjectPermissions}. These are the workflow endpoints that address a model's data and [workflow state history]{@api rest:endpoint:GET:/workflow-state-history/{app_label}/{model}/{object_id}/}. Their [`crudl_perms_map`]{@api py:property:vueda.core.permissions.DynamicObjectPermissions.crudl_perms_map} names an action, which the class resolves through the mapping on each check.

| Method        | `DynamicObjectPermissions` action |
| ------------- | --------------------------------- |
| `GET`, `HEAD` | `read`                            |
| `POST`        | `create`                          |
| `PUT`         | `update`                          |
| `PATCH`       | `read`                            |
| `DELETE`      | `delete`                          |
| `OPTIONS`     | None                              |

The [field choices]{@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/} and [filter choices]{@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/} endpoints check the `read` codename on the model. When the options are another model's rows, they also check the `list` codename on that model. Both resolve through the mapping on each check.

Workflow endpoints also check `vueda_workflow.read_workflow`, except object state and `permitted_transitions`. [Workflow as a Permission Overlay](../core-concepts/workflow-permission-overlay) lists the gates each workflow endpoint applies.

## Row-Level Hooks

A model opts in by declaring an inner `RowLevelPermissions` class that subclasses {@api py:class:vueda.core.permissions.BaseRowLevelPermissions}. Each hook is a `classmethod`, and the base class returns `None` from all four. [Row-Level Permission Filtering](../core-concepts/row-level-permission-filtering) describes which requests run each hook, and [Permission Model](../core-concepts/permission-model#permission-authority-layers) describes the order of the instance hooks among the layers.

### Signatures

| Hook                                                                                                                 | Signature                                                                                                          | Runs                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| [`check_queryset`]{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_queryset}                   | `check_queryset(cls, queryset, perm, user, perm_type)`                                                             | For `list`, bulk delete, and {@term Model History} events about the model's rows                         |
| [`check_queryset_workflow`]{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_queryset_workflow} | `check_queryset_workflow(cls, queryset, perm, user, perm_type, state_denied_annotation, state_granted_annotation)` | After `check_queryset` and the {@term State Permission} filter, on a {@term Workflow-Enabled Model} only |
| [`check_instance`]{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance}                   | `check_instance(cls, model, obj, perm, user, perm_type)`                                                           | In every {@term Object-Scope Check}, except when a state rule denied the codename                        |
| [`check_instance_workflow`]{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance_workflow} | `check_instance_workflow(cls, model, obj, perm, user, perm_type, grant_or_deny)`                                   | Last in every object-scope check on a workflow-enabled model, whatever the state rules returned          |

### Arguments

| Argument                                                                                                                                    | Hooks                     | Value                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`queryset`]{@api py:param:vueda.core.permissions.BaseRowLevelPermissions.check_queryset.queryset}                                          | Queryset hooks            | The rows so far. `check_queryset_workflow` receives them after the state filter, with the two state annotations added.                                                                             |
| [`perm`]{@api py:param:vueda.core.permissions.BaseRowLevelPermissions.check_queryset.perm}                                                  | All                       | The codename being checked, as `<app_label>.<codename>`, after mapping. Instance hooks also receive the workflow and transition permission codenames that workflow checks test against the object. |
| [`user`]{@api py:param:vueda.core.permissions.BaseRowLevelPermissions.check_queryset.user}                                                  | All                       | The requesting user.                                                                                                                                                                               |
| [`perm_type`]{@api py:param:vueda.core.permissions.BaseRowLevelPermissions.check_queryset.perm_type} (queryset hooks)                       | Queryset hooks            | The caller's action name, before mapping: `"list"` for `list`, `"delete"` for bulk delete, `"read"` for history.                                                                                   |
| [`perm_type`]{@api py:param:vueda.core.permissions.BaseRowLevelPermissions.check_instance.perm_type} (instance hooks)                       | Instance hooks            | The codename's text before its first underscore, after mapping: `read` for `myapp.read_widget`. Under Django's names it is `view`, `add`, or `change` for those actions.                           |
| [`model`]{@api py:param:vueda.core.permissions.BaseRowLevelPermissions.check_instance.model}                                                | Instance hooks            | The object's class.                                                                                                                                                                                |
| [`obj`]{@api py:param:vueda.core.permissions.BaseRowLevelPermissions.check_instance.obj}                                                    | Instance hooks            | The object being checked.                                                                                                                                                                          |
| [`state_denied_annotation`]{@api py:param:vueda.core.permissions.BaseRowLevelPermissions.check_queryset_workflow.state_denied_annotation}   | `check_queryset_workflow` | The name of a boolean annotation: `True` when a state rule for the row's current state denies the codename to one of the user's groups.                                                            |
| [`state_granted_annotation`]{@api py:param:vueda.core.permissions.BaseRowLevelPermissions.check_queryset_workflow.state_granted_annotation} | `check_queryset_workflow` | The name of a boolean annotation: `True` when such a rule grants it.                                                                                                                               |
| [`grant_or_deny`]{@api py:param:vueda.core.permissions.BaseRowLevelPermissions.check_instance_workflow.grant_or_deny}                       | `check_instance_workflow` | The state rules' result for the object: `True` (grant), `False` (deny), or `None` (no rule matched).                                                                                               |

Under the default mapping, the two `perm_type` values agree. They differ when the mapping renames an action: for `list` under Django's names, the queryset hooks receive `"list"` and `perm` ends in `view_<model_name>`.

### Return Values

| Return  | Queryset hooks                                                                                               | Instance hooks                                        |
| ------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `Q`     | Filters the queryset by the condition.                                                                       | Not accepted.                                         |
| `True`  | Leaves the queryset unchanged.                                                                               | Grants, replacing the decision of the earlier layers. |
| `False` | Returns an empty queryset. From `check_queryset`, the state filter and `check_queryset_workflow` do not run. | Denies, replacing the decision of the earlier layers. |
| `None`  | Leaves the queryset unchanged.                                                                               | Keeps the decision of the earlier layers.             |

A `check_instance_workflow` result is final, a state deny included. `check_queryset_workflow` can only remove rows, so it cannot restore a row the state filter removed.

## Status Codes

The status code a refused request returns depends on the check that refused it. [Permission Model](../core-concepts/permission-model#why-refused-requests-fail-differently) describes why.

| Request                                                                                                                | Refusal                                                                                                                                                                                            | Status | Response                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| Any viewset request, including `list` and `create`                                                                     | The {@term Model-Scope Check} fails, and no state grant defers it ({@term Model-Scope Deferral})                                                                                                   | `403`  | `detail` message                                                                                                       |
| `list`                                                                                                                 | Row filtering removes every row                                                                                                                                                                    | `200`  | Empty `results`, `totalRecords` of `0`                                                                                 |
| Retrieve                                                                                                               | The object check denies `read`                                                                                                                                                                     | `404`  | The same response as a missing object                                                                                  |
| `update`, `partial_update`, single-object `DELETE`                                                                     | The object check denies the action, and the user can read the object                                                                                                                               | `403`  | `detail` message                                                                                                       |
| `update`, `partial_update`, single-object `DELETE`                                                                     | The object check denies the action, and the user cannot read the object                                                                                                                            | `404`  | The same response as a missing object                                                                                  |
| Bulk delete ([`destroy`]{@api py:function:vueda.core.viewsets.VuedaViewSet.destroy} with `pks`)                        | A pk is missing, removed by row filtering, or refused by its object check                                                                                                                          | `400`  | One error per such pk, keyed by pk: `"Object with pk=<pk> does not exist."` Nothing is deleted.                        |
| Field choices, filter choices                                                                                          | The user lacks `read_` on the model, or `list_` on the related model                                                                                                                               | `403`  | `detail` message                                                                                                       |
| Workflow endpoints other than object state and `permitted_transitions`                                                 | The user lacks `vueda_workflow.read_workflow`                                                                                                                                                      | `403`  | `detail` message                                                                                                       |
| Object state, object transitions, single-object execute transition, workflow state history                             | The object check denies `read`                                                                                                                                                                     | `403`  | `detail` message                                                                                                       |
| [Bulk execute transition]{@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/}  | An `object_ids` entry is missing, or the user cannot read it                                                                                                                                       | `404`  | The same response for both. No transition is applied.                                                                  |
| [Execute transition]{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.execute_transition}                      | The user lacks a {@term Workflow Permission} or {@term Transition Permission}; the transition code is unknown; the transition does not leave the current state; another request holds the row lock | `400`  | Validation error. A bulk request keys the errors by object id and applies no transition.                               |
| [`permitted_transitions`]{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/permitted_transitions/} | The model does not enable `class Vueda.Workflow`                                                                                                                                                   | `200`  | `[]`, for any user with `read_` on the model                                                                           |
| `permitted_transitions`                                                                                                | The user lacks `read_` on the model, `vueda_workflow.read_workflow`, or the workflow's workflow permissions                                                                                        | `403`  | `detail` message                                                                                                       |
| Any workflow check                                                                                                     | The model enables `class Vueda.Workflow` but has no workflow definition                                                                                                                            | `500`  | [`WorkflowNotConfiguredError`]{@api py:class:vueda.workflow.exceptions.WorkflowNotConfiguredError} message in `detail` |

[Workflow as a Permission Overlay](../core-concepts/workflow-permission-overlay) describes the transition gates and the workflow endpoint rules.

## Permission Name Mapping

`PERMISSION_NAMES_MAPPING` renames permission actions (see {@term Permission Mapping}). [Map Django and VUEDA Permission Names](../guides/permission-name-mapping) gives the steps to set it and check the result. VUEDA supports two values.

The default, from {@api py:function:vueda.core.default_settings.get_defaults}:

```python
PERMISSION_NAMES_MAPPING = {
    "add": "create",
    "change": "update",
    "view": "read",
}
```

Django's names, for a database whose permission rows and group assignments already use `add`, `change`, and `view`:

```python
PERMISSION_NAMES_MAPPING = {
    "create": "add",
    "list": "view",
    "read": "view",
    "update": "change",
}
```

| Consumer                                                          | Reads the mapping                     | Follows                                                                                                                                                     |
| ----------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Permission row creation (`migrate`)                               | When it runs                          | Any key                                                                                                                                                     |
| `ObjectPermissions.perms_map`                                     | Once, when `patch_django` is imported | Only the values `add`, `change`, and `view`, each when it is not also a key. A `view` value makes every `GET` require `view_`, for `list` and detail alike. |
| Row-level filtering, `DynamicObjectPermissions`, choice endpoints | When each check runs                  | Any key                                                                                                                                                     |

Map `list` to `view` whenever `read` maps to `view`. The viewsets then check the same codename as row-level filtering and the choice endpoints. Other mappings, such as `"delete": "remove"` or `"list": "browse"`, create permission rows that `ObjectPermissions` never checks.
