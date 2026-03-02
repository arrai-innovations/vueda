---
title: Action Contract and Availability
type: explanation
audience: implementor
status: draft
---

# Action Contract and Availability

VUEDA manages action visibility and authorization through a contract that spans three boundaries: server-side action declaration and metadata emission, object-level availability computation, and client-side {@term Route Admission} and UI affordance filtering. Each boundary enforces a different aspect of action availability, and the observable behaviour depends on how the three layers interact. When they align, actions appear and function as expected. When they diverge, because metadata, permissions, or config constraints are out of sync, the failure surfaces as missing buttons, unexpected redirects, or permission denials that appear to contradict the advertised action set.

This page explains the contract boundary, the metadata each layer produces and consumes, and the failure patterns that emerge when the layers drift apart. For the practical steps to wire action availability in a project, see [Control Action Availability in the UI](../guides/control-action-availability). For the underlying permission model that drives action filtering, see [Permission Model](./permission-model). For the boundary between server authorization and client UI semantics, see [Authorization vs UI Semantics](./authorization-vs-ui-semantics).

## Contract Boundary

The action contract divides authority between three scopes.

The server declares actions and emits metadata. Action declaration happens at the viewset level, where DRF's `@action` decorator (extended by VUEDA's {@api py:function:vueda.core.decorators.action} wrapper) registers extra actions alongside the built-in {@term CRUDL} operations. The server's model-info endpoint aggregates these declarations into a `model_actions` payload that describes what actions exist, which HTTP methods they support, and whether they operate at detail or list scope. This metadata is permission-sensitive: actions that the requesting user cannot perform are omitted.

The server also computes per-object availability. When an object is serialized for a `detail` response, the `available_actions` field evaluates each action against the specific object's permission state. This is a stricter filter than model-scope metadata, because it accounts for row-level constraints, workflow state, and object-specific permission overrides that cannot be evaluated without a concrete instance.

The client consumes both metadata layers to control routing and rendering. Route guards use `model_actions` (along with optional config and workflow overlays) to determine whether a route is admissible. Rendered UI controls use the intersection of config-filtered actions and object-level `available_actions` to decide which buttons and links to display. The client does not make authorization decisions; instead, it gates UI affordances based on server-advertised metadata.

## Server Action Declaration and Route Partitioning

Action declaration extends DRF's action registration with a VUEDA-specific `bulk` marker. Every action carries three routing-relevant properties: `detail` (whether the action targets a single object via URL parameters), `bulk` (whether the action operates on a set of objects at list scope), and the HTTP methods it responds to.

VUEDA's router uses these properties to partition actions into route families. `detail` actions are mounted as `detail` routes under the object URL prefix. Non-`detail` actions and bulk-flagged actions are mounted as `list` routes. This partitioning determines the URL shape and the scope at which the action is dispatched. The `bulk` flag is a declaration and routing signal only; it does not impose any automatic payload semantics. An action flagged as bulk is routed at list scope, but the request body format is entirely determined by the action's implementation.

The router extends DRF's default route generation to support the bulk partition. Detail extra actions produce detail-scoped routes; non-detail and bulk extra actions produce list-scoped routes. This routing logic is the single source of truth for URL structure; action metadata in `model_actions` reflects the routing outcome but does not independently determine it.

## Model-Scope Action Metadata

The model-info endpoint ({@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}) emits `model_actions` as a list of action descriptors, each containing the action's `name`, `detail` and `bulk` flags, supported HTTP methods (`method_names`), and optional `parameters` and `detail_args`.

Built-in action candidates are `list`, `retrieve`, `create`, `update`, `partial_update`, and `destroy`. Among the built-ins, `destroy` is flagged `bulk: true`. Non-list, non-create built-ins are flagged `detail: true` and include `detail_args` (defaulting to `["pk"]`). Each built-in action's `method_names` is derived from a fixed mapping: `list` and `retrieve` map to `get`, `create` to `post`, `update` to `put`, `partial_update` to `patch`, and `destroy` to `delete`.

Extra actions declared on the viewset are included as well. An extra action's name is its `url_name`, and its `method_names` are derived from the DRF action mapping keys (`extra_action.mapping.keys()`), which means a single extra action can advertise multiple HTTP methods when declared with `methods=["get", "post"]`. For detail extra actions, `parameters` is derived from the action method's function signature, excluding `self` and `request`. Actions with variadic signatures (`*args`, `**kwargs`) will leak those parameter names into the metadata, an artifact of signature introspection, not intentional semantics.

Built-in action inclusion is permission-sensitive. Model-info generation evaluates each candidate against the requesting user's permissions using a synthetic request context (`AvailableActionsRequest`) with `obj=None`. Actions for which the user lacks permission are omitted from `model_actions`. This means `model_actions` is user-specific: two users with different permission sets see different action lists for the same model.

Extra action visibility is further filtered by `get_allowed_extra_actions(request)` when the viewset implements this method. This hook enables viewset-level logic to exclude extra actions from model-scope metadata based on request context, independent of the standard permission check.

When the canonical registration for a model has no viewset, only a serializer, `model_actions` is empty. No actions are advertised, and the client treats the model as having no actionable routes.

## HTTP Method Mapping Metadata

The `method_names` field on each action descriptor is a list of lowercase HTTP verb strings. On the server side, the field is emitted as `method_names` (snake_case). The client's model-info store normalizes all metadata keys to camelCase, so the same field appears as `methodNames` in client code.

For built-in actions, the method mapping is fixed and is defined by `METHOD_MAPPING` in the serializer. For extra actions, the methods are derived from the DRF action's `mapping` attribute, which reflects the `methods` argument passed to the `@action` decorator.

In the current client implementation, `method_names`/`methodNames` is descriptive metadata. Route admission checks are performed by action name membership, not by HTTP method intersection. The guard checks whether the action's `name` appears in the merged action set (model-info actions, optional `routeActions` filter, workflow transition codes). Method metadata is available to consumers who need transport-level information, for example, to choose between `GET` and `POST` when dispatching an action request. However, it does not participate in the route admission decision.

## Object-Scope Availability Metadata

While `model_actions` describes what actions exist for a model, `available_actions` describes what actions the requesting user can perform on a specific object. This field is computed per serialized instance and appears in `detail` responses.

The computation runs each standard action (retrieve, update, partial_update, destroy) through object-level permission checks. `create` is excluded for concrete instances; it applies at model scope, not object scope. The result is a list of action names for which the user has permission on that specific object.

Extra actions are appended through `get_allowed_extra_actions(request, instance=instance)`. This is the same hook as the model-scope version, but with the instance argument, enabling object-specific filtering of extra action availability.

The {@term Model-Scope vs Object-Scope Availability} distinction is fundamental to the contract. Model-scope metadata answers "Does this action exist and might this user be able to perform it?" Object-scope availability answers the question, "Can this user perform this action on this specific object right now?" The two can diverge legitimately: a user may have the model-level permission for `update` (so it appears in `model_actions`), but a specific object may be in a workflow state that denies `update` (so it is absent from that object's `available_actions`).

## Client {@term Action Namespace} and {@term Route Admission}

The client normalizes action names before performing {@term Route Admission} checks. The normalization maps aliases to canonical names; most notably, `read` is normalized to `retrieve`. This normalization ensures that route definitions using either name resolve consistently against the server-advertised action set.

Route admission is evaluated in the {@api js:function:@arrai-innovations/vueda.router/guards.requireModelInfo} navigation guard. The guard fetches model-info for the target route's model, then checks whether the route's action name (after normalization) appears in the computed action set. The action set is assembled from three sources: the `model_actions` names from model-info, an optional `routeActions` filter from the model's config (which restricts the set to only named actions), and workflow transition codes (which extend the set with transition-specific routes).

When the action is not found in the computed set, the guard denies the route. The denial surfaces as a toast notification ("Action Not Found") and a redirect, typically to the model's `list` view. When model-info itself cannot be fetched (network error, server error), the error is cached in the model-info store and reused for subsequent navigation attempts to the same model key. This means a transient fetch failure will block all routes for that model until the store is reset or the page is reloaded.

For resolved routes, {@api vue:component:ViewActionRouter} maps action names to view components. Standard CRUDL actions resolve to their built-in view components. Transition codes resolve to the workflow transition view. Unknown actions, those that pass the guard but have no corresponding view component, render using `ViewActionNotFound`.

## UI Affordance Filtering Layers

Route admission and rendered UI controls are separate filtering layers. A route may be admitted (the action exists in `model_actions` and passes the guard), but the corresponding UI control may be hidden because of additional client-side filtering.

The first filtering layer is group-based config filtering. `useFilteredActions` reads the model config's `config.actions` setting and filters the available actions to only those listed. This enables product-specific UX constraints, for example, hiding the `destroy` action from certain user groups, without modifying server-side authorization. If `config.actions` is not defined, no filtering is applied, and all server-advertised actions pass through.

The second filtering layer is object-level intersection. In detail-style views, the rendered action buttons are the intersection of the config-filtered action set and the object's `available_actions`. An action must pass both filters to appear as a rendered control. This means a `detail` view can show different action buttons for different objects of the same model, reflecting per-object permission outcomes.

Workflow transition controls are sourced separately from the workflow transition store rather than inferred from CRUDL action metadata. Transitions have their own data flow and rendering logic.

## Dry-Run and Mutation Semantics

Mutation actions support a dry-run mode triggered by the `Dry-Run: true` request header. When a dry-run request is received, the VUEDA action decorator sets `request.dry_run = True` and wraps the action execution in rollback semantics. The action runs normally, validation fires, side effects may be computed, but no database changes are committed.

Rollback is enforced at the outermost dry-run wrapper. If a dry-run action internally calls another action that is also decorated, the nested call does not stack an additional rollback. This prevents double-rollback errors and ensures the outermost transaction boundary controls persistence.

For destroy operations, dry-run behaviour has specific response semantics. A dry-run delete returns `200` with the object's serialized data intact; the object is not deleted. A non-dry-run delete returns `204` when the deletion is committed. Validation failures in either mode surface as `400` without performing the deletion.

Dry-run mode is intended for validation and simulation. It enables the client to preflight a mutation, checking whether the action would succeed and what validation errors would surface, without committing the change. The client should not redirect or emit success toasts after a dry-run response.

## Failure Surface and Drift Patterns

The layered contract exhibits several characteristic failure patterns when the layers are misaligned.

**Model-scope visibility exceeds object-scope availability.** This is the most common drift pattern. An action appears in `model_actions` because the user has the model-level permission, so the route guard admits the navigation. But the specific object denies the action due to row-level constraints or workflow state, so the action button is absent from the `detail` view. In more severe cases, the user navigates to the action route directly (via URL or bookmark), passes the guard, but the subsequent API request fails with a `404` (row-filtered object) or `403` (object-level permission denial). The design intentionally allows model-scope metadata to be broader than object-scope availability, but it can confuse users who see a route that "works" but an action that does not.

**Config over-restriction hides valid actions.** When `config.routeActions` is set too narrowly, server-advertised actions are excluded from the route admission set. The action exists on the server, model-info reports it, but the client-side filter removes it before the guard evaluates. The symptom is an "Action Not Found" toast and redirect, with no indication that the action was filtered by config rather than missing from the server.

**Workflow transitions without string codes break guards.** The route guard evaluates transition availability by checking the transition's `code` property. If a transition object lacks a valid string `code`, the guard throws an error (`requireModelInfo: workflow transition is missing a string code`) rather than gracefully treating the transition as unavailable. This is an explicit validation failure that surfaces as a runtime exception rather than the normal toast-and-redirect flow.

**Legacy config keys are silently ignored.** The supported route-filtering key is `routeActions`. The legacy key `routerActions` is ignored; a warning is logged once, but no error is thrown. If a project uses the legacy key, the expected route filtering simply does not happen.

**Cached model-info errors persist across navigations.** When the model-info store encounters a fetch error, the error is cached and reused for all subsequent navigations to the same `app.model` key. Retrying the navigation does not trigger a refetch. The only recovery is a store reset or page reload. This can cause a transient server error to appear permanent to the user.

**Method metadata is not a route gate.** Treating `method_names`/`methodNames` as a route admission signal is incorrect in the current client implementation. Route admission is via action-name membership. Code or tests that assume route denial due to a verb mismatch will not behave as expected.

**OpenAPI prose can drift from runtime semantics.** The `method_names` field is generated from actual DRF mapping data, but OpenAPI documentation or prose descriptions of action semantics may not accurately reflect runtime `detail`/`list` partitioning. The authoritative source for whether an action is detail-scoped or list-scoped is the runtime behaviour and test expectations, not generated documentation text.

## Relevant Implementation Surface

- {@api py:module:vueda.core.decorators}
- {@api py:property:vueda.core.decorators.DRY_RUN_HEADER}
- {@api py:module:vueda.core.routers}
- {@api py:class:vueda.core.routers.VuedaRouter}
- {@api py:function:vueda.core.routers.VuedaRouter.get_routes}
- {@api py:module:vueda.info.serializers}
- {@api py:class:vueda.info.serializers.ModelInfoSerializer}
- {@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_actions}
- {@api py:module:vueda.core.viewsets}
- {@api py:function:vueda.core.viewsets.VuedaViewSet.get_allowed_extra_actions}
- {@api py:module:vueda.core.serializers.fields}
- {@api py:class:vueda.core.serializers.fields.AvailableActionsField}
- {@api py:function:vueda.core.serializers.fields.AvailableActionsField.get_value}
- {@api py:class:vueda.core.utils.AvailableActionsRequest}
- {@api rest:endpoint:GET:/vueda.info/model_info/}
- {@api js:module:@arrai-innovations/vueda.stores/storeModelInfo}
- {@api js:module:@arrai-innovations/vueda.stores/storeModelConfig}
- {@api js:module:@arrai-innovations/vueda.utils/actionMap}
- {@api js:function:@arrai-innovations/vueda.utils/actionMap.getActionName}
- {@api js:module:@arrai-innovations/vueda.router/guards}
- {@api js:module:@arrai-innovations/vueda.use/useFilteredActions}
- {@api js:function:@arrai-innovations/vueda.use/useFilteredActions.useFilteredActions}
