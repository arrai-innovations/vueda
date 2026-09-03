---
title: Architecture Overview
type: explanation
audience: integrator
status: draft
---

# Architecture Overview

VUEDA is a metadata-driven framework for building admin-style {@term CRUDL} applications. A Django server defines models, serializers, and viewsets; a Vue client discovers those definitions at runtime through a metadata API and mechanically generates routes, forms, and views from them. No hand-wired per-model client code is required for standard surfaces, though the framework supports customization where needed.

The architecture cleanly splits authority: the server owns data integrity, permissions, and metadata shape; the client owns rendering, form state, and route resolution. Understanding where that boundary falls, and why, is the foundation for everything else in the system.

## Server Responsibility Layers

The server is organized into four responsibility layers. Each layer builds on the one below it, and everything above the base layer inherits its guarantees without opting in.

### Domain infrastructure

(`vueda.core`) defines the base model, serializer, and viewset contracts that all domain modules inherit. This layer establishes transactional boundaries (all writes within a request are atomic), the permission-evaluation order, an input-validation policy (unknown fields are rejected), and routing conventions. A domain module that extends `VuedaModel`, `VuedaSerializer`, and `VuedaViewSet` inherits all of these behaviours.

(`vueda.history`) records model changes through PostgreSQL triggers. Every eligible `VuedaModel` subclass is tracked by default, whatever else it extends, and a model opts out or excludes fields through `class Vueda.History`. `VuedaHistoryModel`, `VuedaHistorySerializer`, and `VuedaHistoryViewSet` remain the classes that read that history back, through the history expands and the `history-list` endpoint.

A module whose models do not extend the `vueda.core` base classes opts out of the integration entirely, history included.

### Metadata and discovery

(`vueda.info`) exposes canonical registration and model-info endpoints. This is the bridge between server-side model definitions and client-side UI generation. It derives field shapes, available actions, filtering and ordering capabilities, and permission lists from whatever the domain infrastructure layer defines. Without this layer, the client has no contract to consume. The metadata and discovery layer is covered in detail in [Canonical Registration and Model Discovery](./canonical-registration-and-discovery) and [Server-Client Metadata Contract](./server-client-metadata-contract).

### Stateful lifecycle

(`vueda.workflow`, `vueda.vdq`) encodes state machines and asynchronous dispatch workflows. Workflow transitions are enforced server-side and reflected in metadata; available actions change based on the object's state. The dispatch queue (VDQ) delegates potentially long-running work, such as email and SMS delivery, to a worker process while maintaining state visibility through the same workflow mechanism.

### Cross-cutting concerns

(`vueda.user`, `vueda.history`) handle authentication, session management, TOTP two-factor authentication, and audit history. These cut across all domain modules but do not define the architectural shape; they are consumed by the layers above.

## Client Responsibility Layers

The client is a Vue single-page application that generates its UI entirely from server metadata. It is organized into four layers, each consuming the output of the one above it.

### Metadata consumption.

Pinia stores fetch, normalize, and cache the server contract. {@api js:module:@arrai-innovations/vueda/stores/storeModelInfo} holds the server-derived field, action, filter, ordering, and permission metadata. {@api js:module:@arrai-innovations/vueda/stores/storeModelConfig} merges those defaults with client-side overrides. Together, they produce the configuration that all downstream layers consume.

### Routing and gating.

Router guards load metadata before allowing navigation. Route entry is blocked until model-info is available and the requested action is confirmed present, which is determined by intersecting server-advertised actions, client config restrictions, and workflow transition codes. No view renders without its contract being satisfied.

### UI generation.

Composables and builders translate metadata into reactive form models. Field types map to Field components; field properties map to Widget components; props are merged from metadata defaults, config overrides, and component-level props. The form lifecycle (values, errors, touched state, modification tracking) is managed through composables and symbol-based injection.

### Rendering.

View components (`ViewList`, `ViewCreate`, `ViewRead`, `ViewUpdate`) and the `ViewActionRouter` consume the generated form models and render them using VUEDA's own control and widget components (built on Reka UI). Custom action views are loaded dynamically by naming convention. The derivation pipeline from metadata to rendered UI is covered in [Contract-First Dynamic UI](./contract-first-dynamic-ui).

## Runtime Topology

Three processes make up the runtime system. They share a database and cache but are otherwise isolated.

The **web process** (WSGI) handles all synchronous request/response work: CRUDL operations, metadata queries, workflow transitions, authentication, and webhook ingestion. All database writes in a request are wrapped in a transaction (`ATOMIC_REQUESTS`). Any unhandled exception causes the entire request to roll back. No partial writes persist.

The **worker process** (Celery) handles asynchronous dispatch: email delivery, SMS delivery, and periodic status checks. Workers share the same database, cache, and Django settings as the web process, but they do not have access to HTTP request context or middleware. State changes to worker tasks follow the same workflow transition rules as the web process; there is no separate permission model for background work. However, because workers lack request context, any logic that depends on the current user or session must be passed explicitly rather than inferred from middleware.

The **client** (Vue SPA) runs entirely in the browser. It communicates primarily with the server via REST endpoints. It has no direct access to the database, cache, or worker process. Everything the client knows about the system comes from the metadata API and data endpoints.

## Architectural Dependencies

The architecture assumes a specific infrastructure stack. These are not pluggable abstractions; the system depends on concrete capabilities of each component.

**PostgreSQL** provides the relational database. The schema uses PostgreSQL-specific capabilities, including array fields, range types, GIN indexes, and generated columns. Substituting a different database engine would require changes beyond settings.

**Redis** serves as shared cache and session coordination across web and worker processes. It is the mechanism by which these processes share a transient state without direct communication.

A **message broker** (RabbitMQ or Redis) connects the web process to the worker process for async task dispatch. Without it, VDQ queue items are created in the database but never processed.

External delivery providers (**Anymail** for email, **Twilio** for SMS) are optional and only relevant when VDQ dispatch is in use.

## Design Principles

These principles express the constraints VUEDA enforces by default and why.

### Server

- **Base-class centralization**: shared behavior lives in `VuedaModel`, `VuedaSerializer`, and `VuedaViewSet`; extensions happen via mixins rather than ad-hoc overrides.
- **Strict input hygiene**: unknown fields and query params are rejected by default (`NoExtraFieldsSerializerMixin`, `NoExtraFieldsForViewSetMixin`) to keep API contracts tight.
- **Explicit expand and sparse control**: flex-field expansion is allowed only when declared and validated; expansion metadata is curated in serializer context.
- **Transaction safety by default**: `create`, `update`, and `destroy` operations are wrapped in atomic transactions.
- **Row-level permission filtering**: `list` endpoints apply row-level access filtering inside viewsets, not just at the queryset boundary.
- **Action-scoped serializer behavior**: viewsets can use per-action serializer classes to formalize read/write differences.
- **Predictable bulk semantics**: bulk destroy, activate, and deactivate flows are standardized and validate primary keys rigorously.
- **Validation errors are structured**: the server raises `VuedaValidationError` with field-keyed error payloads for client consumption.

### Client

- **Composition-first API**: behavior is built from composables and small helpers rather than inheritance.
- **State-first contract**: composables return `state` plus operations; consumers can observe or act independently.
- **Explicit state transitions**: loading, error, and errored flags are first-class and consistently wired.
- **Safe reactivity boundaries**: `readonly`, `shallowReadonly`, `markRaw`, and `effectScope` limit accidental deep reactivity and ensure cleanup.
- **Stable state shapes**: default object shapes are created up front to keep templates predictable and reactive.
- **Cancellable async flows**: requests expose `cancel()` and avoid duplicate in-flight work.
- **Deterministic slot and naming conventions**: derived slot names and field paths define extension points.
- **JSDoc-driven typing**: rich typedefs make JS composables ergonomic for TypeScript consumers.

## Convention Over Configuration

The integration between server and client is driven by convention, not per-model wiring. Three conventions structure the system.

**Canonical registration is the root of discoverability.** A model that is registered with a serializer and viewset automatically appears in model-info, gets metadata-derived client routes, form generation, permission gating, and action availability. A model that is not registered gets none of these. There is no gradual opt-in; registration is the single switch that controls whether a model participates in the framework. Registration is covered in detail in [Canonical Registration and Model Discovery](./canonical-registration-and-discovery).

**Metadata drives UI and routing.** The client does not contain hand-wired knowledge of which models exist, what fields they have, or what actions are available. All of this is derived from model-info at runtime. When the server contract changes, fields are added, actions removed, or permissions updated, the client adapts without code changes.

**Custom endpoints outside conventions opt out of integration.** A viewset that does not extend `VuedaViewSet`, or an endpoint that bypasses the router conventions, will not appear in model-info, will not get automatic permission checks, and will not generate client routes. This is by design. The integration benefits come from following the conventions, and opting out is explicit.

## The Authorization Boundary

The server is the sole authorization boundary. This is an architectural invariant, not a recommendation.

Permissions are evaluated server-side at multiple layers: model-level CRUDL codenames, object-level checks, row-level queryset filtering, and workflow-state overlays. The metadata API reflects these decisions: action visibility in model-info is permission-sensitive, but the client treats metadata as advisory for UX purposes rather than as an enforcement mechanism.

Client-side visibility decisions (e.g., hiding a button or disabling a field) improve the user experience but do not constitute security boundaries. A user who bypasses the client and calls the API directly still hits every server-side permission check. The client is structurally incapable of granting authority that the server did not advertise, and even if it could, the server would reject unauthorized requests independently.

## Relevant Implementation Surface

- Python:
    - {@api py:module:vueda.core.models}
    - {@api py:module:vueda.core.serializers}
    - {@api py:module:vueda.core.viewsets}
    - {@api py:module:vueda.core.routers}
    - {@api py:module:vueda.info.registration}
    - {@api py:module:vueda.info.serializers}
    - {@api py:module:vueda.info.viewsets}
    - {@api py:module:vueda.core.default_settings}
- JavaScript:
    - {@api js:module:@arrai-innovations/vueda/stores/storeModelInfo}
    - {@api js:module:@arrai-innovations/vueda/stores/storeModelConfig}
    - {@api js:module:@arrai-innovations/vueda/router/guards}
