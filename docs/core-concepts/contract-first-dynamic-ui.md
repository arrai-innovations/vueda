---
title: Contract-First Dynamic UI
type: explanation
audience: implementor
status: draft
---

# Contract-First Dynamic UI

VUEDA's client does not contain hand-wired knowledge of which models exist, what fields they have, or what actions are available. All UI structure is generated at runtime from server metadata, including routes, forms, field components, widget selection, and action visibility. The server defines the contract; the client renders it mechanically.
The client derives that contract from {@api js:module:@arrai-innovations/vueda/stores/storeModelInfo}, so this explanation treats {@term Model Info} as the single runtime source of truth.

This page explains how that derivation works: what the client does with metadata, what constraints it operates under, and how the result is deterministic. For what the metadata surface contains and what each section means, see [Server-Client Metadata Contract](./server-client-metadata-contract). For how models enter the metadata surface in the first place, see [Canonical Registration and Model Discovery](./canonical-registration-and-discovery).

## The Architectural Thesis

Three claims define the contract-first architecture:

**UI is derived, not authored.** The client generates forms, routes, field components, widget selections, and action views from server metadata at runtime. Adding a new model to the server produces a complete client-side {@term CRUDL} surface without writing any client code, as long as the model is registered with a serializer and a viewset. Changing a field on the server changes the form on the client. Removing an action on the server removes the route on the client.

**Metadata is the integration seam.** The model-info contract is the single point where server definitions become client behavior. There is no second channel, no sidecar configuration, and no build-time code generation. Everything the client knows comes from one API. This makes the integration point narrow and auditable: if the client is doing something unexpected, the first place to look is the metadata it received.

**Deviating from conventions opts you out of integration.** A model that is [registered](./canonical-registration-and-discovery) gets metadata, routes, forms, and permission gating automatically. A model or endpoint that bypasses registration gets none of these. The client is structurally incapable of inventing authority that the server did not grant; it can only work with what the metadata API provides.

## Server Metadata Authority

The server defines the authoritative contract surface. The client consumes it but does not contribute to it.

The [metadata contract](./server-client-metadata-contract) provides field schema (types, constraints, read-only markers), the action surface (CRUDL operations plus extras, filtered by user permissions), the expand graph (nested relations and their field shapes), filtering and ordering capabilities, and the permission envelope (codenames visible to the requesting user). All of this is derived from model/field definitions, canonical serializer and viewset definitions, and filtersets; it reflects what the server actually enforces, not a separate declaration layer. If a field is read-only in the serializer, it is read-only in the metadata, and the client renders it as read-only.

The client normalizes server metadata into a stable internal shape used throughout the UI generation layer. This normalization is a translation step, not an authority step. The client strips prefixes, restructures for convenient access, and identifies the primary key field, but it neither adds nor removes contract semantics. What the server says, the client preserves.

## Client Derivation Layer

From the normalized metadata, the client mechanically derives every aspect of the UI surface. None of these decisions requires per-model client code.

### Route Availability

Route availability is determined by intersecting three sources: server-advertised actions from model-info, client config restrictions (which can narrow but not widen the set), and workflow transition codes (which add action names for state-machine transitions).

Router guards block navigation until this intersection is computed. If a user navigates to an action that is not in the intersection, the navigation is blocked. This can be because the server did not advertise it, because the client config excluded it, or because the user lacks permission. No view renders without its contract being satisfied.

### Field and Widget Resolution

Field and widget resolution is type-driven. The server provides type identifiers per field (`type_serializer`, `type_model`, `type_db`); the client maps these deterministically to Field and Widget components through a static mapping table.

Field components handle the structural concerns of a form field: layout, label placement, error display, and help text. Widget components handle input mechanisms such as text input, dropdowns, date pickers, checkboxes, and so on. The separation means the same widget can appear in different field layouts, and the same field structure can host different widgets, depending on the metadata and configuration.

Resolution always yields a component. If the mapping table does not contain an entry for a given type, the client degrades to a known fallback (`WidgetUnmapped`) rather than failing silently or rendering nothing. This guarantees the UI remains deterministic even when metadata introduces types the client does not recognize; the fallback makes the gap visible rather than invisible.

### Action Resolution

Action resolution follows a deterministic priority chain. When the client needs to render a view for a given action, it resolves the component in this order:

1. **Loading state**: if metadata is still being fetched, a loading view is shown.
2. **Workflow transition**: if the action corresponds to a workflow transition, the transition view is used.
3. **Built-in CRUDL view**: standard actions (`list`, `create`, `read`, `update`) resolve to their corresponding built-in view components.
4. **Project-specific action view**: custom actions are resolved by naming convention, allowing projects to provide their own view components for non-standard actions.
5. **Generic fallback**: if none of the above match, a generic action view is rendered.

Every action resolves to exactly one component. There is no ambiguity, and no case in which an action produces no view; the priority chain always terminates.

### Form Generation

Form generation translates field metadata into a reactive form model. For each metadata field, the form builder determines the field component, widget component, validation constraints, initial value handling, and choice-loading behaviour. All of these are derived from the contract.

Choice fields that require dynamic options are marked in metadata (`choices: true`) and fetched lazily when the form renders. The client does not decide which fields have choices; the server's metadata is the sole authority. Fields with static choices receive their options inline with the metadata response. The form lifecycle manages values, errors, touched state, and modification tracking. These are provided through composables and symbol-based provide/inject, which allows nested field structures (including expanded relations) to participate in the same form state without prop drilling.

## Override Precedence and Constraint Model

The client may restrict or reshape what it derives from metadata, but within hard constraints. The override layer is designed to be expressive for UX customization while being structurally incapable of violating the server contract.

### What Overrides Cannot Do

Overrides **cannot invent server actions.** Adding an action name to client config has no effect if the server does not advertise it in model-info. The action will not appear in the route intersection, and no view will be generated for it.

Overrides **cannot bypass permissions.** The server filters action visibility by user. Client config can further restrict the visible set by hiding actions the server advertises, but it cannot expand it. An action the server withheld due to permissions remains invisible regardless of client configuration.

Overrides **cannot redefine field types.** A field's type, constraints, and read-only status come from the server. The client can change which component renders the field (substituting a custom widget, for example), but it cannot change what the field means; its validation rules, its required status, and its type semantics are fixed by the metadata.

### Configuration Precedence

Configuration precedence is stable and global: **component props > model-config overrides > server-derived defaults.** This rule applies uniformly across fields, widgets, routes, and props. It is the same whether the surface is a field component, a widget component, field props, or widget props. There is no context in which the precedence order changes.

This means a component that passes an explicit prop always wins over a model-config override, which always wins over the server-derived default. The predictability of this ordering is a deliberate design choice; it eliminates the class of bugs where "something is overriding my override" because the precedence is always the same.

### Override Surface

Overrides are expressed through model-config (a Pinia store), which supports both generic (all views) and view-specific (list, create, update, etc.) layers. The override surface includes:

- **Display fields**: which fields appear and in what order.
- **Submit fields**: which fields are included in write payloads.
- **Field/widget component replacements**: substituting a custom component for the default.
- **Prop overrides**: passing additional or modified props to field or widget components.
- **Route action restrictions**: narrowing which actions are navigable.
- **Post-action redirects**: controlling where the client navigates after a successful action.

Expanded relations are flattened into the field namespace using double-underscore syntax (`expandName__fieldName`), so overrides to nested fields use the same mechanism as overrides to base fields. There is no separate API for configuring expanded fields.

## Resolution Determinism

The derivation pipeline is designed to be deterministic: the same metadata and configuration always produce the same UI. This property holds because:

- Field and widget resolution uses a static mapping table with a guaranteed fallback. No randomness, no ordering dependency, no ambient state.
- Action resolution follows a fixed priority chain that always terminates at exactly one component.
- Configuration precedence is a fixed three-level hierarchy that does not vary by context.
- Route availability is a pure intersection of three known sets.

This determinism is what makes the contract-first architecture maintainable. When the server contract changes, the client produces a different UI, but the _process_ by which it derives that UI is always the same. Debugging a UI problem reduces to inspecting the metadata the client received and the configuration it applied, not tracing through per-model rendering logic.

## Failure Modes

**Hardcoded UI assumptions diverge from the server contract.** Client code that assumes a specific field exists, a specific action is available, or a specific filter option is present will break silently when the server contract evolves. The metadata-driven approach is designed to prevent this, but project-specific overrides and custom views can reintroduce the problem if they reference contract details by name.

**Premature overrides obscure defaults.** The default mapping from metadata to components is often correct. Overriding before understanding the default behaviour adds a maintenance burden without value and can mask the actual problem when something goes wrong; the override becomes another variable to investigate.

**Client-side restriction confused with server-side removal.** Filtering `routeActions` in model-config hides an action from the client's navigation, but the action still exists in the API. A user who calls the endpoint directly can still perform the action. Client-side restriction is a UX decision, not a security boundary.

**Lazily-fetched choices assumed to be pre-loaded.** When `choices` is `true` in field metadata, the widget must request the options from the choices endpoint. Code that assumes the options array is already populated will render an empty dropdown until the fetch completes, or permanently if the fetch fails.

**Nested-path overrides instead of double-underscore keys.** Expanded fields are flattened into the field namespace with double-underscore separators. Attempting to override an expanded field using a nested object path rather than the flattened key will not match, and the override will be silently ignored.

**Cached metadata errors block the client.** Model-info fetch failures are cached. If the server is temporarily unavailable, the client remains blocked for that model until page reload. There is no automatic retry or cache expiration for failed requests.

## Relevant Implementation Surface

- JavaScript:
    - {@api js:module:@arrai-innovations/vueda/stores/storeModelInfo}
    - {@api js:module:@arrai-innovations/vueda/stores/storeModelConfig}
    - {@api js:module:@arrai-innovations/vueda/use/useFormModel}
    - {@api js:module:@arrai-innovations/vueda/use/useForm}
    - {@api js:module:@arrai-innovations/vueda/use/useFieldRenderer}
    - {@api js:module:@arrai-innovations/vueda/router/guards}
- Vue.js Components:
    - {@api vue:component:ViewActionRouter}
- REST:
    - {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}
    - {@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/}
