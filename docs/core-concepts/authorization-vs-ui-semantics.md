---
title: Authorization vs UI Semantics
type: explanation
audience: integrator
status: draft
---

# Authorization vs UI Semantics

VUEDA splits access decisions between the server and the client. The server decides what a user may read and change, and it checks every request. The client decides which routes open and which buttons appear. It bases those choices on action lists that the server computed for the current user. This page describes the boundary between the two sides, where each side gets its action lists, and what the user sees when the two disagree.

## Server Authorization

The server is the only authority for data access. Each endpoint checks permissions on every request, whatever the client showed before it. {@api py:class:vueda.core.permissions.ObjectPermissions} is the default permission class. It maps the request's HTTP method to a {@term CRUD} codename. For a request on one object, it also runs an {@term Object-Scope Check} through {@api py:function:vueda.user.mixins.VUEDAPermissionsMixin.has_perm}. Some endpoints, such as the workflow endpoints, use their own permission checks. [Permission Model](./permission-model) describes the {@term Permission Layers} those checks apply.

The client does not evaluate permissions. It runs no codename checks, no {@term State Permission} rules, and no {@term Row-Level Permissions} hooks. Running them in the browser would need a second copy of those rules, kept in step with the server. It would also protect nothing, because a user controls the code in their browser and can call the API directly.

## Where Each Side Gets Its Action Lists

The server reports what the current user may do through two action lists. It builds both with its own permission checks, so they match what the server would enforce when it computed them. [Action Contract and Availability](./action-contract-and-availability) describes how each list is computed.

- {@term Model Actions}, in {@term Model Info}, come from a {@term Model-Scope Check} with no object. The list differs between users, and it is the same for every object of the model.
- {@term Available Actions}, on each object payload, come from an object-scope check. Two objects of one model can report different actions for the same user, because row-level rules and workflow state apply per object.

Model info also carries [`model_permissions`]{@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_permissions}, the permission codenames that exist for the model. It lists them whether or not the user holds them. When the model's canonical serializer subclasses {@api py:class:vueda.core.serializers.VuedaReadonlySerializer}, the list holds only the codenames for `list` and `read`. The subclass narrows the metadata only, and the server's checks do not change. Because the list ignores the user, a UI driven by it offers actions the user cannot perform.

The client adds its own inputs, which the server never sees. The model config's [`actions`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.actions} and [`routeActions`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.routeActions} both default to the model actions' names. You can narrow both lists, and `actions` can also limit an action to named groups of users. These inputs change only what the client shows.

## Route Admission

{@term Route Admission} checks a route's action against the user's model actions and {@term Permitted Transitions}, both computed with no object. [Routing and View Resolution Model](./routing-and-view-resolution-model#route-guard-chain) describes the guards, action name normalization, and where a refused route redirects.

## UI Affordance Filtering

Once a view renders, {@api js:function:@arrai-innovations/vueda/use/useFilteredActions#useFilteredActions} filters the model config's `actions` by the user's group memberships. The filter runs in the client and sends no request to the server. It lets a product show fewer actions to some groups without changing server permissions.

A list view's action and transition buttons come from model-scope lists. A detail view shows an action for its object only when the object's `available_actions` also lists it. There, a workflow state that denies `update` on one object removes that object's update button, because the server left `update` out of its `available_actions`. [Action Contract and Availability](./action-contract-and-availability) describes where each view's action and transition buttons come from.

## When the Two Sides Disagree

The two sides can disagree in three ways. [Permissions](../reference/permissions) lists the status code the server returns in each refused case.

**The client hides an action the server permits.** Removing an action from `actions` or `routeActions`, or limiting it to groups, hides its button or blocks its route. The user's permission is unchanged. A direct API call succeeds when the server's checks pass.

**The client admits a route the server then refuses.** Route admission uses model-scope lists, and the request for one object runs an object-scope check. A row-level rule or a state rule can refuse that object after the route opened. A transition route works the same way: the transition is permitted for the model, and executing it checks the object's current state.

**The client's lists are older than the server's rules.** The client caches model info and workflow results per model, failures included. A permission change on the server, or a fetch that failed once, keeps its effect in the client until the cache clears. [Reactive Data Flow](./reactive-data-flow#when-caches-clear) describes when caches clear.
