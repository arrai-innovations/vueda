---
title: Add Workflow State and Transition Permissions
type: how-to
audience: integrator
status: draft
---

# Add Workflow State and Transition Permissions

Use this guide to control who can take each {@term Transition} of a {@term Workflow}, and to grant or deny {@term CRUD} permissions by an object's workflow state. You add {@term Workflow Permission}, {@term Transition Permission}, and {@term State Permission} rows, give groups the permissions those rows name, and then check the results with users from those groups.

[Workflow as a Permission Overlay](../core-concepts/workflow-permission-overlay.md) describes how the server evaluates these rows.

## Before You Begin

- The model is a {@term Workflow-Enabled Model} with a workflow definition: states, an initial state, and transitions with their source states. [Manage Workflows and Generate Workflow Migrations](./manage-workflows.md) gives the steps.
- Your user model includes {@api py:class:vueda.user.mixins.VUEDAPermissionsMixin}. Its [`has_perm`]{@api py:function:vueda.user.mixins.VUEDAPermissionsMixin.has_perm} applies state rules to object checks.
- Your model viewsets use {@api py:class:vueda.core.permissions.ObjectPermissions}. It is the default permission class, so a viewset that sets no `permission_classes` already uses it.
- Your test users belong to groups that grant the permissions named below. A superuser passes every object check, so it cannot show what a group member sees.

The examples use a `myapp.Widget` model with states `draft`, `review`, and `published`. Its transitions are `submit` (draft to review) and `approve` (review to published). `approve` needs a custom permission, which you declare in the model's {@api ext:django:django.db.models.Options.permissions}:

```python
class Widget(VuedaModel):
    class Meta:
        permissions = [("approve_widget", "Can approve widget")]

    class Vueda:
        class Workflow:
            enabled = True
```

## Choose Where to Create the Rows

- **In the browser:** add the rows on the workflow, state, and transition edit forms that [Manage Workflows and Generate Workflow Migrations](./manage-workflows.md) describes. Then run [`makeworkflowmigrations`]{@api py:class:vueda.workflow.management.commands.makeworkflowmigrations.Command} to write a {@term Workflow Migration}. Give groups their permissions on the {@term Group Management Page}, and run [`makegroupmigrations`]{@api py:class:vueda.user.management.commands.makegroupmigrations.Command} to write a {@term Group Permission Migration}. [Manage Groups and Generate Group Migrations](./manage-groups.md) gives those steps.
- **In code:** create the rows in a test fixture or a Django shell, as the steps below show.

The code in the steps shares this setup:

```python
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from vueda.workflow.models import StatePermission, TransitionPermission, Workflow, WorkflowPermission

from myapp.models import Widget

ct = ContentType.objects.get_for_model(Widget)
workflow = Workflow.objects.get(content_type=ct)
read_widget = Permission.objects.get(content_type=ct, codename="read_widget")
update_widget = Permission.objects.get(content_type=ct, codename="update_widget")
approve_widget = Permission.objects.get(content_type=ct, codename="approve_widget")
read_workflow = Permission.objects.get(content_type__app_label="vueda_workflow", codename="read_workflow")

editors, _ = Group.objects.get_or_create(name="Widget Editors")
reviewers, _ = Group.objects.get_or_create(name="Widget Reviewers")
```

## Gate the Workflow

A workflow or transition gate passes only when it has at least one row and the user holds every permission its rows name. [Workflow as a Permission Overlay](../core-concepts/workflow-permission-overlay.md) describes both gates.

1. Add a [`WorkflowPermission`]{@api py:class:vueda.workflow.models.WorkflowPermission} row for each permission a user needs to use the workflow at all:

    ```python
    WorkflowPermission.objects.create(workflow=workflow, permission=read_widget)
    ```

2. Give each group that uses the workflow those permissions, plus `vueda_workflow.read_workflow`. Most workflow endpoints check `vueda_workflow.read_workflow` first.

    ```python
    editors.permissions.add(read_workflow, read_widget, update_widget)
    reviewers.permissions.add(read_workflow, read_widget, approve_widget)
    ```

## Gate Each Transition

1. Add a [`TransitionPermission`]{@api py:class:vueda.workflow.models.TransitionPermission} row for each permission a user needs to take the transition:

    ```python
    TransitionPermission.objects.create(transition=workflow.transitions.get(code="submit"), permission=update_widget)
    TransitionPermission.objects.create(transition=workflow.transitions.get(code="approve"), permission=approve_widget)
    ```

2. Leave a transition without rows when only your code should take it. No user can take it, and code applies it with [`fast_transition`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.fast_transition}, which skips permission checks.

The transition check runs against the object, so state rules on the permissions it names apply.

## Grant or Deny Permissions by State

Add a [`StatePermission`]{@api py:class:vueda.workflow.models.StatePermission} row for each permission a group gains or loses in one state. `grant_or_deny=True` grants and `False` denies. The permission's content type selects the model. A grant can give a permission the group's baseline lacks, and a deny can remove one it has. [Workflow as a Permission Overlay](../core-concepts/workflow-permission-overlay.md) describes how rules combine.

This example lets reviewers edit a widget under review, and stops editors from editing a published one:

```python
StatePermission.objects.create(
    state=workflow.states.get(code="review"),
    permission=update_widget,
    group=reviewers,
    grant_or_deny=True,
)
StatePermission.objects.create(
    state=workflow.states.get(code="published"),
    permission=update_widget,
    group=editors,
    grant_or_deny=False,
)
```

State rules apply only to checks that have an object. A check without an object returns the {@term Baseline Permission}.

## Check Object Permissions by State

Create one user in each group and one widget in each state. Django caches a user's permissions on the user object, so fetch the user again after you change its groups or their permissions.

Expected results for `myapp.update_widget`:

| Group            | Object state | {@term Baseline Permission} | State rule | Expected `has_perm` |
| ---------------- | ------------ | --------------------------- | ---------- | ------------------- |
| Widget Editors   | draft        | `True`                      | none       | `True`              |
| Widget Editors   | published    | `True`                      | deny       | `False`             |
| Widget Reviewers | review       | `False`                     | grant      | `True`              |
| Widget Reviewers | draft        | `False`                     | none       | `False`             |

```python
assert editor.has_perm("myapp.update_widget", obj=draft_widget) is True
assert editor.has_perm("myapp.update_widget", obj=published_widget) is False
assert reviewer.has_perm("myapp.update_widget", obj=review_widget) is True
assert reviewer.has_perm("myapp.update_widget", obj=draft_widget) is False
```

Then send the same updates through the model's API. The reviewer lacks the baseline permission, but the state grant lets the request continue to the object check ({@term Model-Scope Deferral}). The reviewer's `PATCH` to the widget under review succeeds, and the one to the draft widget answers `403`. [Permissions](../reference/permissions.md#status-codes) lists the status code for each refusal.

## Check the Transition Endpoints

Sign in as each test user and call the workflow endpoints for `myapp/widget`:

1. [`GET permitted_transitions/`]{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/permitted_transitions/} lists the transitions whose permissions the user holds. The check has no object, so state rules do not apply. Expect `submit` for an editor and `approve` for a reviewer. A user without the workflow's permissions gets `403`.
2. [`GET object-transitions/{object_id}/`]{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-transitions/{object_id}/} lists the transitions the user can take from the object's current state. Expect `submit` for an editor on a draft widget, and an empty list for an editor on a widget under review.
3. The object payload's {@term Valid Transitions} field lists the same transitions as `object-transitions`. It is empty for a user without the workflow's permissions.
4. [`GET object-state/{object_id}/`]{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-state/{object_id}/} and [workflow state history]{@api rest:endpoint:GET:/workflow-state-history/{app_label}/{model}/{object_id}/} need only `read` on the object. Check that a user with `myapp.read_widget` and no workflow permissions reads both.
5. [`PATCH execute-transition/{object_id}/`]{@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/{object_id}/} with `{"transition_code": "submit"}` moves a draft widget to `review` for an editor. The response has `new_state` and `new_transitions`.
6. Check the refusals. Each of these answers `400` with a validation error: a missing or unknown `transition_code`, a transition that does not leave the current state, a user without the workflow or transition permissions, and a row another request has locked. A user who cannot read the object gets `403`. The [bulk form]{@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/} with `object_ids` answers `404` for an object the user cannot read. When any object fails, it applies no transition.

[Permissions](../reference/permissions.md#status-codes) lists these status codes with the others.

### Dry-Run a Transition

Send the execute request with the `Dry-Run: true` header to preview it. The server skips the row lock and runs the same checks. It writes the transition inside the request transaction, returns the projected `new_state` and `new_transitions`, and then rolls the transaction back. It calls [`on_transition`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.on_transition} with `dry_run=True`, so an override that works outside the database should check `dry_run`. [Action Contract and Availability](../core-concepts/action-contract-and-availability.md#dry-run-and-mutation-semantics) describes dry runs for every action.

### Confirm Transition Warnings

If the model overrides [`get_transition_warnings`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.get_transition_warnings}, the first execute request answers `409`. The check runs after the permission checks and before any write, in dry runs too. [Require Confirmation Before a Write](./require-write-confirmation.md#warn-on-a-workflow-transition) gives the steps.

## Check the Client

Sign in to the client as each test user. Transition routes and list view transition buttons follow `permitted_transitions`, and detail view buttons follow `valid_transitions`. A user whom `permitted_transitions` refuses still reaches the model's CRUD routes. A transition route redirects that user with a "Permission Denied" toast. [Routing and View Resolution Model](../core-concepts/routing-and-view-resolution-model.md) describes route admission, and [Action Contract and Availability](../core-concepts/action-contract-and-availability.md) describes where each button comes from.
