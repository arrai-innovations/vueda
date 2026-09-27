---
title: Permission Model (CRUD + Object + State)
type: explanation
audience: integrator
status: draft
---

# Permission Model (CRUD + Object + State)

VUEDA authorizes every API request on the server. A DRF permission class turns the request into a {@term CRUD} codename, and the user model decides that codename through four ordered {@term Permission Layers}. List and bulk delete requests also filter rows. This page describes the layer order, the codename mapping, where model scope and object scope apply, and why a refused request fails the way it does.

## Permission Authority Layers

[`VUEDAPermissionsMixin.has_perm`]{@api py:function:vueda.user.mixins.VUEDAPermissionsMixin.has_perm} decides one codename in four layers, in a fixed order. A check without an object runs only layer 1. A check with an object runs every layer that applies to it. Each layer that returns an answer replaces the decision so far, with one exception in layer 3.

**Layer 1: Baseline model permission.** The mixin calls [Django's `has_perm`]{@api ext:django:django.contrib.auth.models.PermissionsMixin.has_perm} without the object. Django's `ModelBackend` answers `False` to any check that passes an object, so VUEDA handles the object in the later layers. The result is the {@term Baseline Permission}, and it becomes the starting decision.

**Layer 2: Workflow state overlay.** When the object belongs to a {@term Workflow-Enabled Model}, [`check_state_permission`]{@api py:function:vueda.workflow.models.WorkflowModelMethods.check_state_permission} evaluates the {@term State Permission} rules that match the object's current state, the user's groups, and the codename. The result is a tri-state: `True` (grant), `False` (deny), or `None` (no opinion). A grant overrides a baseline denial; a deny overrides a baseline grant. `None` preserves the baseline decision. When multiple state-permission rules match (for example, a user belongs to two groups with conflicting rules), deny wins over grant.

**Layer 3: Row-level instance check.** When the model defines an inner `RowLevelPermissions` class, [`check_instance`]{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance} evaluates the object against project rules. A `True` or `False` result replaces the decision from layers 1 and 2; `None` keeps it. Layer 3 is skipped when layer 2 returned a deny. `check_instance` does not see workflow state, so it cannot undo a state deny.

**Layer 4: Workflow-aware row-level check.** When the object belongs to a workflow-enabled model and the model defines `RowLevelPermissions`, [`check_instance_workflow`]{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance_workflow} runs last. It runs whatever layer 2 returned, and it receives that result as its `grant_or_deny` argument. Project logic here can therefore override a state deny. A `True` or `False` result is the final decision.

The same codename can therefore produce opposite decisions for two objects of one model. Two objects in different workflow states, or two objects that project row rules treat differently, can differ even though the user's baseline permission is the same for both.

## CRUD Codename and Action Mapping

VUEDA models declare `create`, `read`, `update`, `delete`, and `list` as their [`default_permissions`]{@api py:property:vueda.core.models.BaseModelMeta.default_permissions}. The [`patch_django`]{@api py:module:vueda.core.patch_django} module renames Django's `add`, `change`, and `view` codenames through {@term Permission Mapping}. It also adds `list` to every model that does not declare its own default permissions. The `auth_permission` rows therefore carry CRUD names from the first migration. [Map Django and VUEDA Permission Names](../guides/permission-name-mapping) describes how to choose a mapping, why it must be settled before the first migration, and how to check the generated codenames.

With the default mapping, [`ObjectPermissions`]{@api py:class:vueda.core.permissions.ObjectPermissions} maps each HTTP method to a codename through its [`perms_map`]{@api py:property:vueda.core.permissions.ObjectPermissions.perms_map}. `POST` requires `create`, `PUT` and `PATCH` require `update`, and `DELETE` requires `delete`. A `GET` for the `list` action requires `list`; every other `GET` action, such as retrieve or a detail extra action, requires `read`. List access and read access are separate decisions, so a user can hold either one without the other.

Codenames take the form `<app_label>.<action>_<model_name>`. For a model `myapp.Widget`, the five codenames are `myapp.create_widget`, `myapp.read_widget`, `myapp.update_widget`, `myapp.delete_widget`, and `myapp.list_widget`.

## Model Scope and Object Scope

DRF checks a request in two phases. The {@term Model-Scope Check} runs [`has_permission`]{@api py:function:vueda.core.permissions.ObjectPermissions.has_permission} before any object is fetched. It passes no object to `has_perm`, so only layer 1 applies. The {@term Object-Scope Check} runs [`has_object_permission`]{@api py:function:vueda.core.permissions.ObjectPermissions.has_object_permission} on the fetched object and passes it to `has_perm`, so all four layers apply. A `list` request has no object check; row filtering decides which rows it returns.

On a workflow-enabled model, `ObjectPermissions` can hold its own model-scope denial open when a state rule grants the codename to one of the user's groups ({@term Model-Scope Deferral}). The request then reaches a later state-aware decision: the object check for object actions, or state filtering for `list`. Every other permission class on the viewset still has to pass, so authentication and application permission classes keep their authority. [Workflow as a Permission Overlay](./workflow-permission-overlay) describes which actions defer.

## Row-Level Permissions

{@term Row-Level Permissions} are opt-in project rules in a model's `RowLevelPermissions` class, built on [`BaseRowLevelPermissions`]{@api py:class:vueda.core.permissions.BaseRowLevelPermissions}. [`check_queryset`]{@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_queryset} filters the rows of `list` and bulk delete requests in the database, and `check_instance` joins every object check as layer 3. Retrieve, update, and single-object delete do not filter rows; their object check decides. The two hooks are independent, so a project can list a row that an object check refuses, or the reverse. [Row-Level Permission Filtering](./row-level-permission-filtering) describes both hooks, how filtering interacts with pagination and totals, and which rows bulk delete accepts.

## Workflow Overlay and Transition Gates

{@term State Permission} rules grant or deny the same CRUD codenames that baseline permissions use, so the {@term Workflow Overlay} adds no separate permission namespace. They form layer 2 of an object check, and [`filter_rows_for_user`]{@api py:function:vueda.core.permissions.filter_rows_for_user} applies them to `list` rows even when the model defines no `RowLevelPermissions`. Executing a transition is a separate check: the user needs every {@term Workflow Permission} and {@term Transition Permission} the rows name, and the transition must leave the object's current state. A workflow or transition with no permission rows denies every user. [Workflow as a Permission Overlay](./workflow-permission-overlay) describes state rule evaluation, the transition gates, and the gate each workflow endpoint applies.

## Server Authority and UI Visibility

Every decision on this page is server enforcement. The client reads permission results to choose which routes, buttons, and actions to show, and that choice is UI behavior only. An object's {@term Available Actions} list the actions the server allows on it; [Action Contract and Availability](./action-contract-and-availability) describes how the server computes them. [Authorization vs UI Semantics](./authorization-vs-ui-semantics) describes where server enforcement ends and UI visibility begins.

## Why Refused Requests Fail Differently

The layer that refuses a request decides how the refusal looks. The [Permissions reference](../reference/permissions) lists the status code for each case.

**A model-scope denial stops the request before VUEDA fetches any object.** The response reveals nothing about any row.

**An object-scope denial hides an object the user cannot read.** VUEDA keeps the behavior of DRF's [`DjangoObjectPermissions`]{@api ext:drf:rest_framework.permissions.DjangoObjectPermissions}. A refused read answers as if the object did not exist. A refused write answers the same way when the user also lacks `read` on the object, and as a denial when the user can read it. On retrieve, the refusal comes from the layers above: a state deny, `check_instance`, or `check_instance_workflow`.

**A list never fails because of row rules.** Filtering removes rows before pagination, so a user with `list` permission receives the rows they may see, possibly none.

**Bulk delete refuses the whole batch.** When any requested pk is missing, filtered out, or refused by its object check, [`destroy`]{@api py:function:vueda.core.viewsets.VuedaViewSet.destroy} deletes nothing. It reports each such pk with the message `"Object with pk=... does not exist."`. Missing and refused rows get the same message, so the response does not reveal which rows exist.

**Workflow endpoints check `vueda_workflow.read_workflow` first.** [`WorkflowViewSet.check_permissions`]{@api py:function:vueda.workflow.viewsets.WorkflowViewSet.check_permissions} applies this gate before any object check, so it refuses a user whose object permissions would allow the request. Current object state and workflow state history do not require it; they follow the object's own `read` permission. For [`permitted_transitions`]{@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/permitted_transitions/}, a model that does not enable `class Vueda.Workflow` answers an empty list to any user who can read the model. An enabled model with no workflow definition raises `WorkflowNotConfiguredError`.

**Transition refusals are validation errors.** After the object's own `read` check passes, a missing workflow or transition permission is reported as a validation error. So is an unknown transition code, or a transition that does not leave the current state. A row that another request holds locked is reported the same way, with the message `"This object cannot be updated right now. Please try again."`.

**A state grant can move a denial from model scope to object scope.** Only a grant that matches the user's groups, the action's codename, the model's content type, and its workflow defers a model-scope denial. Unrelated rules and state denies leave that denial in place. After deferral, the object check decides each object through all four layers, and a list returns only the rows a state rule grants.
