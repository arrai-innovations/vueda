---
title: Authorization vs UI Semantics
type: explanation
audience: implementor
status: draft
---

# Authorization vs UI Semantics

VUEDA separates authorization from UI action semantics into two independent systems for evaluation. The server owns authorization; every API request is checked against DRF permission classes and the layered permission model described in [Permission Model](./permission-model). The client owns action visibility and route admission; deciding which views to navigate to and which buttons to render, based on metadata the server provides. The client does not evaluate Django permission codenames. It consumes {@term Action} metadata that the server has already permission-filtered and uses it to make semantic decisions about navigation and UI visibility.

This page explains the boundary between these two systems, where each system derives its action sets, and the failure shapes that occur when they diverge. For the server-side permission layers themselves, see [Permission Model](./permission-model). For practical guidance on controlling which actions appear in the UI, see [Control Action Availability](../guides/control-action-availability).

## Authorization Authority Boundary

The server is the sole authority for data access and mutation rights. DRF's default permission class, `ObjectPermissions`, enforces {@term CRUDL} codename checks on every request. Object-level decisions compose baseline model permissions with workflow-state overlays and row-level hooks via `VUEDAPermissionsMixin.has_perm`. This enforcement applies uniformly: model-info endpoints, CRUDL operations, workflow endpoints, and custom actions all pass through the same permission class.

The client cannot enforce authorization. It has no access to permission codenames, group memberships, or row-level policy. What the client does have is metadata: the server tells it which actions are available, and the client uses that information to shape the UI. But metadata-driven UI shaping is not authorization. Hiding a button or blocking a route does not revoke the underlying API permission. A direct API call bypasses the client entirely and succeeds or fails based solely on server rules.

This asymmetry is intentional. Duplicating permission logic on the client would require shipping codename semantics, group resolution, workflow state evaluation, and row-level hook logic to the browser; this would create a parallel authorization engine that would need to stay synchronized with the server. Instead, the client delegates authorization to the server and focuses on what it can own: which views to present and which actions to surface.

## {@term Model-Scope vs Object-Scope Availability} Semantics

The server provides action metadata at two distinct scopes, and the distinction matters for understanding what the client consumes.

**`model_actions`** are computed at model scope through a {@term Model-Scope Check}. The model-info endpoint evaluates which CRUDL and extra actions the requesting user is permitted to perform, based on the canonical viewset's permission checks run with a synthetic request and no object. This produces a list of action names: `create`, `read`, `update`, `delete`, `list`, plus any extra actions permitted by `get_allowed_extra_actions`. The result is user-specific (different users may see different action sets) but not object-specific (the check does not evaluate against any particular instance). Route guards and model-level configuration consume this metadata.

**`available_actions`** are computed at object scope through an {@term Object-Scope Check}. When the server serializes an individual object, the `AvailableActionsField` runs object-level permission checks across the standard CRUDL actions (excluding `create`, which does not apply to existing instances) and appends any permitted extra actions. The result is both user-specific and object-specific: two objects of the same model may report different {@term Available Actions} for the same user, because workflow state or row-level hooks can produce different outcomes per instance. `detail` views consume this metadata to determine which action buttons to show for a specific object.

**`model_permissions`** is a third metadata surface that is sometimes confused with the other two. It returns the content-type permission catalogue for the model; the full set of permission codenames that exist, regardless of whether the requesting user holds them. It is not user-filtered and not an executable action list. Using `model_permissions` as the source of truth for action availability over-advertises capabilities: the UI may suggest operations that the user cannot perform.

## {@term Route Admission} Semantics

Client-side route admission determines whether navigation to a view is permitted. It is a semantic gate, not an authorization gate; it checks whether the target action has been declared as available in the metadata, not whether the user holds the underlying permission codename.

CRUDL route generation inserts the `requireModelInfo` guard on every list and `detail` route. When navigation triggers, the guard fetches model-info for the target model (if not already cached), normalizes the route's action name through `getActionName` (which maps `read` to `retrieve`), and checks whether that normalized name exists in the computed action set.

The action set for route admission is the union of three sources: the `model_actions` returned by the server, the optional `routeActions` configuration that constrains which actions are permitted for this model's routes, and workflow transition codes fetched from the permitted-transitions endpoint. If the target action is not found in this union, the guard redirects to the `list` view and shows an "Action Not Found" toast.

Route admission can succeed even if the eventual API call fails. The guard evaluates model-scope metadata, but the actual operation may be denied at object scope. A user might be permitted to see a `detail` view because `read` exists in `model_actions`, but the specific object they navigate to might be filtered out by row-level permissions, producing a `404` on the API fetch. The route guard's purpose is to prevent navigation to views that have no declared semantics, not to pre-evaluate object-level authorization.

## UI Affordance Filtering

Once a route is permitted and a view renders, the actions visible in the UI are filtered through a separate layer. This filtering is a UI visibility decision, controlling what the user sees, not an authorization decision.

`useFilteredActions` is the primary UI visibility filter. It takes the model's configured `actions` map (which maps action names to group requirements) and the user's group memberships, and returns the subset of actions the user should see. This is a client-side intersection: the server is not consulted for this filter. It enables product-specific visibility rules; a single product deployment can display a subset of actions to certain groups without changing server permissions.

For `list` views, the visible actions are the output of `useFilteredActions`. For `detail` views, the visible actions are the intersection of the filtered UI actions and the server's `available_actions` for the specific object. This intersection is the bridge between the two systems: the client's UI visibility rules are combined with the server's object-level permission truth. An action that passes the client's group filter but is absent from the object's `available_actions` will not render.

This means that detail-view action buttons reflect current, per-object authorization truth. If a workflow state denies `update` permission on a specific object, the update button disappears from that object's `detail` view; not because the client evaluated a permission rule, but because the server's `available_actions` response excluded `update` for that instance.

## Workflow Transition {@term Action Namespace}

Workflow transitions participate in the same action namespace as CRUDL and extra actions. They are not a separate routing or UI visibility system; transition codes are treated as first-class action identifiers at every level where actions are evaluated.

On the server, the `permitted_transitions` endpoint returns transition objects with `code` and `name` properties for transitions that the requesting user is permitted to execute. This endpoint enforces `vueda_workflow.read_workflow` at the viewset level and, at the transition level, performs permission checks per transition. The `code` property is the machine identifier; `name` is display text only.

On the client, transition codes are extracted from the permitted-transitions response and appended to the action set that route guards consume. The `requireModelInfo` guard concatenates transition codes with model-info actions before checking whether the route's target action exists in the set. This means a route to a transition view is allowed only if the transition's code appears in the user's permitted transitions, which are themselves permission-filtered by the server.

`ViewActionRouter` resolves views by searching both the actions array and the transitions array. When the normalized action name matches a transition code, the router renders the transition view for the workflow. When an action name with the literal value `transition` is encountered, it renders the workflow transition view directly. This parallel lookup means transitions and standard actions share a single resolution path.

Detail and `list` views render transition buttons alongside standard action buttons. `DetailedView` extracts transition codes from the workflow store and renders them as available transitions. `ViewList` creates a set of transition codes and unions them with bulk actions for model-level rendering. In both cases, transitions appear in the same button area as CRUDL actions.

Transition availability is model-scoped for route admission but can be object-scoped for execution. A route may be permitted for a transition code (because the transition appears in permitted transitions for the model), but execution on a specific object may fail if that object is not in a valid source state for the transition. This failure surfaces as a `400` validation error from `execute_transition`, not as a route rejection.

## Divergence and Failure Signatures

The separation between server authorization and client UI semantics creates predictable divergence points. Understanding these helps diagnose situations where the UI shows one thing, but the API does another.

**UI-hidden action, API-permitted.** Removing an action from `config.actions` or constraining `routeActions` hides buttons and blocks routes, but the API permission remains intact. A direct API call (or a client-side navigation that bypasses the guard) succeeds if the server permits it. The client controls what actions are shown, not authorization.

**Route-permitted action, object-scope denial.** The route guard permits a view because the action exists in model-scope metadata, but the API call for the specific object returns `404` (row-level filtered) or `403` (object-level denied). This happens because route admission is model-scoped and the denial is object-scoped. The user sees the view for a brief moment before the error occurs.

**`model_permissions` vs `model_actions` confusion.** `model_permissions` lists all permission codenames for a content type. `model_actions` lists the actions the requesting user can perform. Using `model_permissions` to drive UI visibility suggests capabilities the user may not have. The correct source for action-driven UI is `model_actions` (model scope) or `available_actions` (object scope).

**Action name normalization mismatch.** The action namespace uses `retrieve` internally, but external references may use `read`. `getActionName` normalizes `read` to `retrieve` before matching. If a custom action or route uses `read` without normalization, the guard or `ViewActionRouter` will not find a match. The symptom is an "Action Not Found" toast or a `ViewActionNotFound` render.

**Cached metadata errors.** Both `storeModelInfo` and `storeWorkflow` cache fetch errors. If a model-info or permitted-transitions fetch fails (network error, 403, invalid response), the error is cached per `app.model` key. Subsequent navigation attempts for the same model short-circuit to the cached error without retrying the fetch. Recovery requires recreating the store instance (typically through component lifecycle reset).

## Relevant Implementation Surface

- {@api py:module:vueda.core.permissions}
- {@api py:class:vueda.core.permissions.ObjectPermissions}
- {@api py:function:vueda.core.permissions.ObjectPermissions.has_permission}
- {@api py:module:vueda.user.mixins}
- {@api py:function:vueda.user.mixins.VUEDAPermissionsMixin.has_perm}
- {@api py:module:vueda.info.serializers}
- {@api py:class:vueda.info.serializers.ModelInfoSerializer}
- {@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_actions}
- {@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_permissions}
- {@api py:module:vueda.core.serializers.fields}
- {@api py:class:vueda.core.serializers.fields.AvailableActionsField}
- {@api py:function:vueda.core.serializers.fields.AvailableActionsField.get_value}
- {@api py:module:vueda.core.viewsets}
- {@api py:function:vueda.core.viewsets.VuedaViewSet.get_allowed_extra_actions}
- {@api py:module:vueda.workflow.viewsets}
- {@api py:function:vueda.workflow.viewsets.WorkflowViewSet.check_permissions}
- {@api py:function:vueda.workflow.viewsets.WorkflowViewSet.permitted_transitions}
- {@api rest:endpoint:GET:/vueda.info/model_info/}
- {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}
- {@api rest:endpoint:GET:/vueda.workflow/workflows/{app_label}/{model}/permitted_transitions/}
- {@api js:module:@arrai-innovations/vueda.router/guards}
- {@api js:function:@arrai-innovations/vueda.router/guards.requireModelInfo}
- {@api js:function:@arrai-innovations/vueda.router/guards.requireGroups}
- {@api js:module:@arrai-innovations/vueda.router/makeCrud}
- {@api js:function:@arrai-innovations/vueda.router/makeCrud.makeCRUDRoutes}
- {@api js:module:@arrai-innovations/vueda.utils/actionMap}
- {@api js:function:@arrai-innovations/vueda.utils/actionMap.getActionName}
- {@api js:module:@arrai-innovations/vueda.stores/storeModelInfo}
- {@api js:module:@arrai-innovations/vueda.stores/storeWorkflow}
- {@api js:module:@arrai-innovations/vueda.use/useFilteredActions}
- {@api js:function:@arrai-innovations/vueda.use/useFilteredActions.useFilteredActions}
- {@api vue:component:ViewActionRouter}
