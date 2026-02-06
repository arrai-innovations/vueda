---
audience: implementors
status: draft
type: index
---

# Core Concepts

Core Concepts explains the "why" behind VUEDA defaults and the contracts that let server and client work together predictably.

## System Foundations

- [Architecture Overview](architecture-overview.md): Layers, boundaries, and main extension points.
- [Canonical Registration and Model Discovery](canonical-registration-and-discovery.md): Why models are registered and how info endpoints discover them.
- [Contract-First Dynamic UI](contract-first-dynamic-ui.md): Why UI is driven by server metadata rather than hardcoded forms.

## Data and API Contracts

- [Server-Client Metadata Contract](server-client-metadata-contract.md): Model fields, actions, expands, filters, ordering, permissions.
- [Field and Expand Semantics](field-and-expand-semantics.md): Meaning of serializer fields, expandable relations, and sparse responses.
- [Filtering and Ordering Semantics](filtering-and-ordering-semantics.md): How server filtersets/ordering shape client query controls.
- [Error and Validation Contract](error-and-validation-contract.md): Validation payload shapes, `non_field_errors`, and client form handling.
- [Primary Key and Identifier Discipline](pk-and-identifier-discipline.md): Expected identifier formats and conversion across Python/JS boundaries.

## Authorization and Behavior

- [Permission Model (CRUDL + Object + State)](permission-model.md): Full permission evaluation model in VUEDA.
- [Authorization vs UI Semantics](authorization-vs-ui-semantics.md): Why UI visibility and server authorization are intentionally distinct.
- [Why VUEDA Does Not Use Django Permissions on the Client](why-no-django-permissions-in-client.md): Avoid overloading server permissions for UI concerns; client checks are guidance, server checks are enforcement.
- [Action Contract and Availability](action-contract-and-availability.md): `available_actions`, route actions, group filtering, and safe fallback behavior.
- [Workflow as a Permission Overlay](workflow-permission-overlay.md): State permissions, transition permissions, and row-level outcomes.
- [Row-Level Permission Filtering](row-level-permission-filtering.md): Queryset/object checks and list filtering guarantees.

## Client Runtime Model

- [Reactive Data Flow (Stores + Composables)](reactive-data-flow.md): How stores/composables coordinate model info, config, and object data.
- [Cancellable Network Operations](cancellable-network-operations.md): Why cancellation is built into CRUD and fetch helpers.
- [Form State and Validation Lifecycle](form-state-and-validation-lifecycle.md): Client-side form graph, touched/modified/ignored state, and server error integration.
- [Routing and View Resolution Model](routing-and-view-resolution-model.md): How CRUD routes and action routing resolve to concrete components.

## Operational Concepts

- [Configuration Surface and Defaults](configuration-surface-and-defaults.md): VUEDA defaults, required settings, and security-sensitive options.
- [VDQ and Background Work Model](vdq-and-background-work.md): Queue item lifecycle, transition hooks, and async execution boundaries.
- [Schema and Documentation Generation Model](schema-and-doc-generation.md): How DRF/OpenAPI and docs-tooling feed generated reference docs.
