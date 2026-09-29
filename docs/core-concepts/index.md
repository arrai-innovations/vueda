---
audience: integrator
status: draft
type: index
---

# Core Concepts

Core Concepts pages explain how VUEDA behaves: the contracts that the server and client rely on, where each side's authority ends, and what fails when a contract breaks. The [Guides](../guides/) give the steps. These pages assume you know Django, Django REST framework, and Vue ([What you need to know](../tutorials/start-building#what-you-need-to-know)).

## System Foundations

- [Architecture Overview](architecture-overview.md): The layers on the server and the client, the Django apps and infrastructure they need, and which pages describe each topic.
- [Canonical Registration and Model Discovery](canonical-registration-and-discovery.md): How registration decides which models the client can see, and what fails when registration is missing or wrong.
- [Contract-First Dynamic UI](contract-first-dynamic-ui.md): How the client builds its default UI from {@term Model Info}, the order in which configuration layers apply, and how the client picks a field's widget.
- [Model Feature Policy](model-feature-policy.md): How `class Vueda` declares which framework features a model participates in.

## Data and API Contracts

- [Server-Client Metadata Contract](server-client-metadata-contract.md): Each model-info section and the key names that the server and the client use for it.
- [Field and Expand Semantics](field-and-expand-semantics.md): How the `f`, `om`, and `e` parameters shape a response, which expands each action permits, and what an expand costs.
- [Filtering and Ordering Semantics](filtering-and-ordering-semantics.md): Which filter and ordering parameters the server accepts, rejects, and publishes, and how the client builds its controls from them.
- [Error and Validation Contract](error-and-validation-contract.md): The `400` validation body, the `409` warning body, and the client error class for each status.
- [Primary Key and Identifier Discipline](pk-and-identifier-discipline.md): How the server marks the primary key field, how identifiers travel between the client and the server, and why choice values are strings.

## Compatibility and Boundaries

- [DRF Ecosystem Compatibility Boundaries](drf-ecosystem-deviations.md): Where VUEDA's defaults change the behavior of DRF, django-filter, drf-flex-fields, and drf-writable-nested.
- [Nested Write Compatibility](nested-write-compatibility.md): How the serializer reads a nested body, the order in which it writes rows, and when each validation runs.

## Authorization and Behavior

- [Permission Model (CRUD + Object + State)](permission-model.md): How the server turns a request into a codename, the order of the permission layers, and how a refused request fails.
- [Authorization vs UI Semantics](authorization-vs-ui-semantics.md): Which decisions the server makes, which the client makes, and what the user sees when the two disagree.
- [Action Contract and Availability](action-contract-and-availability.md): How the server reports the actions that a user may take, and how the client uses those lists for routes and buttons.
- [Workflow as a Permission Overlay](workflow-permission-overlay.md): How an object's workflow state changes a permission decision, and the gates on each transition.
- [Row-Level Permission Filtering](row-level-permission-filtering.md): Which requests apply row-level permission hooks, and how `list` pagination, totals, and bulk delete follow them.

## Client Runtime Model

- [Reactive Data Flow (Stores + Composables)](reactive-data-flow.md): How stores cache model info, model config, workflow data, and choices, and how composables and route guards read those caches.
- [CRUD Adapter Layer](crud-adapter-layer.md): The adapter registries, what each default adapter sends and accepts, and the contract that a replacement adapter meets.
- [Cancellable Network Operations](cancellable-network-operations.md): When the client cancels a request, how aborting a request differs from discarding its response, and which parts of the client cancel.
- [Form State and Validation Lifecycle](form-state-and-validation-lifecycle.md): The shared form state, how local validation and server feedback enter it, and when a form may submit.
- [Routing and View Resolution Model](routing-and-view-resolution-model.md): The route records, the checks that a navigation must pass, and how the client picks the view for an action.
- [Theming and Customization](theming-and-customization.md): How the active theme supplies every component class, and the four customization scopes (instance, component, family, and brand).

## Operational Concepts

- [Configuration Surface and Defaults](configuration-surface-and-defaults.md): The Django settings, shared query parameter names, and Vite variables that configure a project, and what fails when one is missing.
- [VDQ and Background Work Model](vdq-and-background-work.md): The queue item row and its workflow, the transaction and locking rules, and how provider results arrive.
