---
title: Implement Row-Level Permissions
type: how-to
audience: integrator
status: draft
---

# Implement Row-Level Permissions

This guide adds {@term Row-Level Permissions} to a model, so each user sees and changes only the rows your rules allow. It ends with the tests that confirm the rules. [Row-Level Permission Filtering](../core-concepts/row-level-permission-filtering) describes where each hook runs and why the two scopes are separate.

## Before You Begin

Check that the model's API uses the VUEDA defaults that run the hooks:

- The model's viewset inherits from {@api py:class:vueda.core.viewsets.VuedaViewSet}. Its `list` comes from {@api py:class:vueda.core.viewsets.ListRowLevelViewSetMixin}, which applies row filtering.
- The API's permission class is {@api py:class:vueda.core.permissions.ObjectPermissions}. VUEDA's default settings set it in `DEFAULT_PERMISSION_CLASSES`. Check that your settings and the viewset keep it.
- The user model ({@api ext:django:setting:AUTH_USER_MODEL}) includes {@api py:class:vueda.user.mixins.VUEDAPermissionsMixin}, whose [`has_perm`]{@api py:function:vueda.user.mixins.VUEDAPermissionsMixin.has_perm} runs the instance hooks. {@api py:class:vueda.user.models.AbstractVUEDAUser} includes it.

The examples below use this model:

```python
from django.conf import settings
from django.db import models


class Project(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    is_public = models.BooleanField(default=False)
```

The rule: a user with the model permission can read any public project. Only the owner can read a private project, and only the owner can change or delete a project.

## Step 1: Filter Rows with `check_queryset`

Add a `RowLevelPermissions` inner class that inherits from {@api py:class:vueda.core.permissions.BaseRowLevelPermissions}, and implement {@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_queryset}:

```python
from django.db.models import Q

from vueda.core.permissions import BaseRowLevelPermissions


class Project(models.Model):
    ...

    class RowLevelPermissions(BaseRowLevelPermissions):
        @classmethod
        def check_queryset(cls, queryset, perm, user, perm_type):
            if perm_type == "delete":
                return Q(owner=user)
            return Q(is_public=True) | Q(owner=user)
```

The hook receives the queryset, the full permission codename in `perm`, and the user. Its [`perm_type`]{@api py:param:vueda.core.permissions.BaseRowLevelPermissions.check_queryset.perm_type} is `"list"` for `list` responses and `"delete"` for bulk delete. It is `"read"` when {@term Model History} filters events about the model's rows.

Return a {@api ext:django:django.db.models.Q} to filter the rows, `False` for no rows, or `True` or `None` to leave them unfiltered. The filter runs in the database, so express the rule over model fields.

## Step 2: Check Single Objects with `check_instance`

`check_queryset` does not affect retrieve, update, or delete of a single object. Without an instance hook, a user can open a row by pk that `list` hides. Add {@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance} with the same rule:

```python
class RowLevelPermissions(BaseRowLevelPermissions):
    # check_queryset from step 1

    @classmethod
    def check_instance(cls, model, obj, perm, user, perm_type):
        if obj.owner_id == user.pk:
            return None  # keep the model permission decision
        if perm_type == "read" and obj.is_public:
            return None
        return False
```

The hook runs on every object permission check. Its [`perm_type`]{@api py:param:vueda.core.permissions.BaseRowLevelPermissions.check_instance.perm_type} is the codename's action prefix, such as `read`, `update`, or `delete`. Return `False` to deny, or `None` to keep the decision of the earlier layers. A `True` return replaces that decision with a grant.

[Permission Model](../core-concepts/permission-model) describes the layer order. [Permissions](../reference/permissions) lists each hook's arguments and return values.

Keep the hook cheap. When a response includes {@term Available Actions}, the server runs an object check for each built-in action on each row. `check_instance` then runs several times per row of a `list` page.

## Step 3: Add the Workflow Hooks (Workflow Models Only)

For a {@term Workflow-Enabled Model}, {@term State Permission} rules already filter the rows and take part in object checks. Add the {@term Row-Level Workflow Permissions} hooks only when your row rule must combine with the object's state:

```python
class RowLevelPermissions(BaseRowLevelPermissions):
    # check_queryset and check_instance from steps 1 and 2

    @classmethod
    def check_queryset_workflow(
        cls, queryset, perm, user, perm_type, state_denied_annotation, state_granted_annotation
    ):
        # Owners keep their rows; others need a state grant for the row's current state.
        return Q(owner=user) | Q(**{state_granted_annotation: True})

    @classmethod
    def check_instance_workflow(cls, model, obj, perm, user, perm_type, grant_or_deny):
        if grant_or_deny is False and obj.owner_id == user.pk:
            return True  # the owner passes a state deny
        return None  # keep the earlier decision
```

{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_queryset_workflow} runs after the state rules remove denied rows. It can narrow the rows further but cannot restore rows the state rules removed. It receives the names of two boolean annotations on the queryset, [`state_denied_annotation`]{@api py:param:vueda.core.permissions.BaseRowLevelPermissions.check_queryset_workflow.state_denied_annotation} and [`state_granted_annotation`]{@api py:param:vueda.core.permissions.BaseRowLevelPermissions.check_queryset_workflow.state_granted_annotation}. Use them in the `Q` you return.

{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance_workflow} runs last in an object check. It receives the state rules' result in [`grant_or_deny`]{@api py:param:vueda.core.permissions.BaseRowLevelPermissions.check_instance_workflow.grant_or_deny} (`True`, `False`, or `None`). A non-`None` return is the final decision, even over a state deny. [Workflow as a Permission Overlay](../core-concepts/workflow-permission-overlay) describes how state rules decide.

## Step 4: Keep Row Filtering in Custom Code

The default `list` calls {@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.apply_row_level_filter} after the filter backends and before pagination and {@term Column Totals}. Row filtering does not happen in `get_queryset`. A custom action, or an overridden `list` that does not call the mixin's `list`, returns unfiltered rows. Call `apply_row_level_filter` yourself at the same point:

```python
queryset = self.filter_queryset(self.get_queryset())
queryset = self.apply_row_level_filter(queryset)
page = self.paginate_queryset(queryset)
```

A custom detail action that loads its object with `self.get_object()` runs the object permission check, which calls `check_instance`. An action that queries the model directly skips it.

## Step 5: Test Allowed and Denied Users

Give the test users their model permissions through groups, for example `myapp.list_project`, `myapp.read_project`, `myapp.update_project`, and `myapp.delete_project`. Then vary only the row conditions: owner, non-owner of a public project, and non-owner of a private project. [Permissions](../reference/permissions) lists the status code for each refusal.

Cover these cases:

- `list`: an owner sees their own rows plus public rows. A user who matches no rows gets `200` with empty `results` and `totalRecords` of `0`.
- `list` with pagination and totals: `totalRecords`, `totalPages`, and `columnTotals` count only the visible rows. If the viewset declares column totals, test them with row filtering active.
- Retrieve: the owner gets `200`. A non-owner of a private project gets `404`, which hides that the row exists.
- Update and single delete: a non-owner of a public project gets `403`, because they can read it. A non-owner of a private project gets `404`.
- Bulk delete: when every requested pk passes both hooks, the rows are deleted. When any pk fails, nothing is deleted. The response is `400`, keyed by pk, with `"Object with pk=... does not exist."`, the same message as for a missing pk.

[Row-Level Permission Filtering](../core-concepts/row-level-permission-filtering) explains the empty `list`, the `404`, and the bulk delete message. Bulk delete runs the object check once for each row that passes `check_queryset`, so its time grows with the number of pks.

## Troubleshooting

**`list` returns every row.** The viewset does not inherit from `VuedaViewSet`, or it overrides `list` without calling `apply_row_level_filter` (step 4).

**Retrieve returns `200` for a row that should be denied.** `check_instance` returns `None` for that row, which keeps the model permission decision. Return `False` to deny.

**A row is in `list` but retrieve returns `404`, or the reverse.** `check_queryset` and `check_instance` disagree for that row. VUEDA does not compare the two hooks, so keep their rules consistent.
