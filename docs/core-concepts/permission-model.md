---
title: Permission Model (CRUDL + Object + State)
type: explanation
audience: integrator
status: draft
---

# Permission Model (CRUDL + Object + State)

VUEDA enforces API authorization through a layered permission model. Every request passes through a DRF permission class that maps HTTP methods to permission codenames, a user-level permission mixin that composes baseline model permissions with {@term Workflow Overlay} and row-level hooks, and viewset-level queryset filtering that controls row visibility in list and bulk-`delete` operations. These layers evaluate in a fixed order, and each layer can override the decision of the one before it.

This page explains the layers, their evaluation order, and the observable failure shapes they produce. For the boundary between server authorization and client UI visibility semantics, see [Authorization vs UI Semantics](./authorization-vs-ui-semantics). For mapping between Django's built-in permission names and VUEDA's {@term CRUDL} names, see [Map Django and VUEDA Permission Names](../guides/permission-name-mapping). For the deep mechanics of row-level queryset and instance filtering, see [Row-Level Permission Filtering](./row-level-permission-filtering). For the full workflow overlay model, including state permission data and transition gates, see [Workflow as a Permission Overlay](./workflow-permission-overlay).

## Permission Authority Layers

Authorization decisions flow through four layers, evaluated in order. Each layer can override the outcome of the previous one, except layer 3 can be skipped in one situation.

**Layer 1: Baseline model permission.** `VUEDAPermissionsMixin.has_perm` begins by calling Django's standard `has_perm` without passing an object. This produces a boolean based on the user's assigned permissions and group memberships, the same check that Django would perform natively. The result becomes the starting decision. Superusers short-circuit the entire evaluation and always receive `True`.

**Layer 2: Workflow state overlay.** When the object under evaluation participates in a workflow, `check_state_permission` evaluates `StatePermission` entries that match the object's current state, the user's groups, and the required permission codename. The result is a tri-state: `True` (grant), `False` (deny), or `None` (no opinion). A grant overrides a baseline denial; a deny overrides a baseline grant. `None` preserves the baseline decision. When multiple state-permission rules match: for example, a user belongs to two groups with conflicting rules, deny wins over grant.

**Layer 3: Row-level instance check.** When an object is present and the model defines a `RowLevelPermissions` class, `check_instance` evaluates the object against project-defined row-level logic. The return is `True`, `False`, or `None`. A non-`None` result overrides the decision from layers 1 and 2, except when layer 2 returned `False`, because the state denial is considered authoritative for non-workflow-aware row logic.

**Layer 4: Workflow-aware row-level check.** When the object participates in a workflow and a `RowLevelPermissions` class exists, `check_instance_workflow` runs regardless of whether layer 2 denied permission. This hook receives the `grant_or_deny` outcome from layer 2 as an argument, allowing project-defined logic to override even a state denial. A non-`None` result from this layer becomes the final decision.

The layered design means that the same permission codename can produce different outcomes for different objects of the same model. Two objects in different workflow states, or two objects that trigger different row-level logic, can yield opposite authorization decisions even though the user's baseline model permission is the same for both.

## CRUDL Codename and Action Mapping

VUEDA replaces Django's default permission codename vocabulary. Where Django generates `add`, `change`, `view`, and `delete` codenames, VUEDA's base model meta declares `create`, `read`, `update`, `delete`, and `list` as the default permission set. The `patch_django` module monkey-patches Django's codename generation and built-in permission creation to use these names, so permission rows in `auth_permission` carry {@term CRUDL} labels from initial migration onward. See [Map Django and VUEDA Permission Names](../guides/permission-name-mapping) for the configuration and validation details.

The DRF permission class `ObjectPermissions` maps HTTP methods to CRUDL codenames. The mapping is straightforward for write methods: `POST` requires `create_*`, `PUT` and `PATCH` require `update_*`, and `DELETE` requires `delete_*`. For `GET`, the mapping is action-sensitive. When the viewset action is `list`, the required codename is `list_*`. For all other `GET` actions (retrieve, custom `detail` actions), the required codename is `read_*`. This split means that a user can have list access without detail-read access, or vice versa; the two are independent permission decisions.

The codename pattern is `{app_label}.{action}_{model_name}`. For a model `myapp.Widget`, the five base codenames are `myapp.create_widget`, `myapp.read_widget`, `myapp.update_widget`, `myapp.delete_widget`, and `myapp.list_widget`.

## Object-Level Decision Precedence

DRF evaluates permissions in two phases: a model-scope check (`has_permission`) that runs before the object is fetched, and an object-scope check (`has_object_permission`) that runs after the object is available.

The model-scope check is where VUEDA can defer a baseline denial. For models that participate in a workflow, `ObjectPermissions.has_permission` looks for a state grant matching the workflow, model content type, user's groups, and action-specific permission codename. A matching grant defers the denial only when the action has a guaranteed later state-aware decision. Standard object actions defer to `has_object_permission`; framework list actions defer to queryset-level workflow filtering. Create and other collection actions without such a decision retain the baseline model result.

Enabling workflow does not alter the complete DRF permission result. This keeps authentication, composite permission expressions, and application-specific permission classes authoritative even when state-permission data exists. Only `ObjectPermissions` can defer its own model-level denial.

Deferral can change the failure shape. Without a matching state grant, a user missing a model permission sees `403`; the object is never fetched. With a matching grant on an object action, the denial may move to object scope and become `404` when the eventual object is not authorized.

## Queryset-Level Row Filtering

Queryset filtering controls which rows appear in `list` responses and which rows are eligible for bulk deletion. Workflow-state filtering is built in for workflow models: matching state denies remove rows from a baseline-authorized queryset, while a user admitted by a state grant receives only matching granted rows. This filtering does not depend on the model defining `RowLevelPermissions`.

Application-defined {@term Row-Level Permissions} remain a separate, opt-in path. Queryset filtering applies before pagination and serialization, while object-level checks apply to individual instances.

The two hooks, `check_queryset` and `check_instance`, are independent interfaces because they serve different purposes and may intentionally implement different rules. Queryset filtering must express its logic as a `Q` object or a boolean; it operates at database scope and cannot make per-row decisions that require object state, external lookups, or expensive computation. Instance checks operate on a materialized object and can implement arbitrarily complex logic, including remote API calls or cross-system policy evaluation. This means a project may intentionally grant list visibility to rows that would be denied at instance scope, or vice versa. The two layers are designed to operate independently and may produce different outcomes.

The queryset hook, `BaseRowLevelPermissions.check_queryset`, returns one of four values: a `Q` object that filters the queryset, `False` to return an empty queryset, `True` or `None`, to skip filtering. The viewset's `apply_row_level_filter` method applies the result. For `list` operations, filtering runs after DRF filter backends but before pagination, so `totalRecords` and `totalPages` in the response reflect the filtered row count. For bulk delete, the same filtering is applied to the requested PKs before object-level permission checks are applied per instance.

For models under workflow, two additional hooks exist: `check_queryset_workflow` adds project-defined restrictions to a queryset after the built-in state overlay, and `check_instance_workflow` operates on a single object. The instance hook can override a state deny; the queryset hook cannot reintroduce rows already removed by the framework overlay.

The full mechanics of queryset and instance filtering, including pagination interaction and bulk-delete eligibility contracts, are covered in [Row-Level Permission Filtering](./row-level-permission-filtering).

## Workflow Overlay and Transition Gates

Workflow permissions operate on the same permission codename strings as baseline CRUDL permissions. A `StatePermission` entry targets a specific workflow state, group, and permission codename with a grant-or-deny flag. This means the workflow overlay does not create a parallel authorization namespace; it modifies the outcomes of the same codenames that model-level permissions use.

Transition execution is a separate authorization surface from CRUDL operations. Executing a transition requires all of the following:

- The object is not locked by another action. If it is locked, the API returns a _try again_ validation error.
- Workflow-level permission: at least one `WorkflowPermission` entry exists for the workflow content type, and the user has all of those permissions.
- Transition-level permission: at least one `TransitionPermission` entry exists for the specific transition, and the user has all of those permissions.
- Source-state validity: the transition is available from the object's current state.

Transitions without transition-permission rows are not permitted (no default-allow path).

Workflow endpoints impose an additional viewset-level gate: `vueda_workflow.read_workflow` admits a caller to workflow definitions, transition discovery, and transition execution. It is not a gate on concrete object data. Current object state and workflow state history follow the target object's own `read` permission and do not require it. This check runs at the viewset `check_permissions` phase, before object-specific authorization. See [Workflow as a Permission Overlay](./workflow-permission-overlay) for the gate each endpoint applies.

`permitted_transitions` gates on `read_workflow` only when a workflow is configured for the requested `app_label/model` pair. A model with no configured workflow skips that gate and falls through to the target model's own `read` permission check, so the endpoint returns `200` with an empty transition list for any user who can read the model, without requiring `read_workflow`. A denial for a model with a configured workflow is unaffected by this exception.

Queue Item (VDQ resend queue) endpoints impose an additional viewset-level gate: the requesting user must have the `vueda_vdq.can_resend` permission for the `Resend` action to be permitted.

For a complete explanation of the workflow overlay model, including state permission evaluation, model-scope deferral, and transition gates, see [Workflow as a Permission Overlay](./workflow-permission-overlay).

## Observable Failure Shapes

Permission denials surface as different HTTP status codes, depending on the layer and endpoint that produced the denial. The mapping is not always intuitive.

**Model-scope denial produces `403`.** When the DRF permission class denies at model scope (no workflow bypass, or the user lacks the baseline permission and no state-permission grants exist), the response is `403 Forbidden`. The object is never fetched.

**Object-scope denial may produce `404`.** When model-scope passes but object-scope denies, DRF's default behavior can raise `Http404` instead of `PermissionDenied`, depending on how `check_object_permissions` is wired. For row-level filtered objects, a `retrieve` request for a filtered-out object returns `404`; the object's existence is hidden from the user. A `list` request with row-level filtering returns `200` with filtered or empty results, never `403`.

**Bulk delete with mixed eligibility produces `400`.** When a bulk-`delete` request includes PKs that are partially filtered out by row-level or object-level checks, the entire operation fails. No rows are deleted. The response is a `400` with validation errors keyed by PK, using the message `"Object with pk=... does not exist."`; the same message used for genuinely missing PKs, which hides the distinction between "does not exist" and "exists but not permitted."

**Workflow endpoint denial produces `403` before object checks.** If the user lacks `vueda_workflow.read_workflow`, workflow definitions, transition discovery, and transition execution return `403` before any object-specific logic runs. This can mask the actual authorization outcome; the user might have object-level permissions, but the viewset-level gate prevents the evaluation from reaching the point where those permissions would be evaluated. Two requests never reach this gate: current object state and workflow state history report the target object's own data, so a `403` from either reflects that object's `read` permission. `permitted_transitions` for a model with no configured workflow also skips the gate, so its `403` reflects the target model's `read` permission instead.

**Transition execution failures produce `400`.** When `apply_transition` raises `PermissionDenied` or `InvalidTransitionError`, the viewset converts it to a `400` validation-style response rather than a `403`. Transition failure is communicated as a validation outcome, not as an HTTP-level authorization rejection. Lock acquisition failures (when `select_for_update(skip_locked=True)` cannot acquire the row lock) also surface as `400` with the message `"This object cannot be updated right now. Please try again."`.

**Only an applicable state grant changes model-scope admission.** Unrelated rules and state denies preserve the baseline gate. A grant matching the caller, action-specific codename, model content type, and workflow can defer an action with a later state-aware decision. An object request may then return `404` at object scope instead of `403` at model scope. A list request may return `200` with a filtered or empty result set.

## Relevant Implementation Surface

- {@api py:module:vueda.core.permissions}
- {@api py:class:vueda.core.permissions.ObjectPermissions}
- {@api py:function:vueda.core.permissions.ObjectPermissions.has_permission}
- {@api py:class:vueda.core.permissions.BaseRowLevelPermissions}
- {@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_queryset}
- {@api py:function:vueda.core.permissions.BaseRowLevelPermissions.check_instance}
- {@api py:module:vueda.user.mixins}
- {@api py:function:vueda.user.mixins.VUEDAPermissionsMixin.has_perm}
- {@api py:module:vueda.core.viewsets}
- {@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.apply_row_level_filter}
- {@api py:function:vueda.core.viewsets.VuedaViewSet.apply_object_permission_filter}
- {@api py:function:vueda.core.viewsets.VuedaViewSet.destroy}
- {@api py:module:vueda.workflow.permissions}
- {@api py:class:vueda.core.permissions.DynamicObjectPermissions}
- {@api py:function:vueda.core.permissions.has_matching_state_grant}
- {@api py:class:vueda.workflow.permissions.WorkflowObjectPermissions}
- {@api py:function:vueda.workflow.permissions.WorkflowObjectPermissions.has_permission}
- {@api py:module:vueda.workflow.views}
- {@api py:module:vueda.workflow.models}
- {@api py:class:vueda.workflow.models.WorkflowModelMethods}
- {@api py:function:vueda.workflow.models.WorkflowModelMethods.check_state_permission}
- {@api py:function:vueda.workflow.models.WorkflowModelMethods.available_transitions}
- {@api py:function:vueda.workflow.models.WorkflowModelMethods.check_workflow_permission}
- {@api py:function:vueda.workflow.models.WorkflowModelMethods.check_transition_permission}
- {@api py:function:vueda.workflow.models.WorkflowModelMethods.apply_transition}
- {@api py:module:vueda.workflow.viewsets}
- {@api py:function:vueda.workflow.viewsets.WorkflowViewSet.check_permissions}
- {@api py:function:vueda.workflow.viewsets.WorkflowViewSet.object_state}
- {@api py:function:vueda.workflow.viewsets.WorkflowViewSet.permitted_transitions}
- {@api py:function:vueda.workflow.viewsets.WorkflowViewSet.execute_transition}
- {@api py:module:vueda.core.patch_django}
- {@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-state/{object_id}/}
- {@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/permitted_transitions/}
- {@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/object-transitions/{object_id}/}
- {@api rest:endpoint:PATCH:/vueda.workflow/workflows/{app_label}/{model}/execute-transition/}
