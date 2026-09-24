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

(`vueda.history`) records model changes through PostgreSQL triggers and serves them as user-action groups. Every eligible `VuedaModel` subclass is tracked by default, whatever else it extends, and a model opts out or excludes fields through `class Vueda.History`. `VuedaViewSet` carries the history endpoint and `VuedaSerializer` publishes the object's revision, so a domain module needs no history-specific base class.

A module whose models do not extend the `vueda.core` base classes opts out of the integration entirely, history included.

### Metadata and discovery

(`vueda.info`) exposes canonical registration and model-info endpoints. This is the bridge between server-side model definitions and client-side UI generation. It derives field shapes, available actions, filtering and ordering capabilities, and permission lists from whatever the domain infrastructure layer defines. Without this layer, the client has no contract to consume. The metadata and discovery layer is covered in detail in [Canonical Registration and Model Discovery](./canonical-registration-and-discovery) and [Server-Client Metadata Contract](./server-client-metadata-contract).

### Stateful lifecycle

(`vueda.workflow`, `vueda.vdq`) encodes state machines and asynchronous dispatch workflows. The server enforces workflow transitions and reflects them in metadata; available actions change with the object's state. The dispatch queue (VDQ) hands long-running work, such as email and SMS delivery, to a worker process. The same workflow mechanism keeps the state of that work visible. Both apps are optional, and VDQ requires workflow. [Django App Boundaries](#django-app-boundaries) covers what each configuration supports.

### Cross-cutting concerns

(`vueda.user`, `vueda.history`) handle authentication, session management, TOTP two-factor authentication, and audit history. These cut across all domain modules but do not define the architectural shape; the layers above consume them. Every supported configuration installs both.

## Django App Boundaries

The server ships seven Django apps, and {@api py:function:vueda.core.default_settings.get_defaults} puts all seven in `VUEDA_APPS`. A project that sets the list itself chooses from the same seven. Installed by default is not the same as required.

### Required infrastructure

Every tested configuration installs `vueda.core`, `vueda.info`, `vueda.user`, `vueda.release`, and `vueda.history`.

`get_defaults()` checks that `VUEDA_APPS` includes `vueda.history`. VUEDA ships event models and trigger operations in the migrations of every app that owns a tracked model. Each of those migrations depends on a `pghistory` node. Django imports every migration module of every installed app, so a configuration that omits `vueda.history` cannot load the migration graph. `get_defaults()` raises `ImproperlyConfigured` rather than letting `migrate` fail later on a missing node.

The other four carry no such check, and no configuration test removes them. Treat them as required. VUEDA does not claim that an installation without them works.

### Optional feature apps

`vueda.workflow` and `vueda.vdq` are removable, and `server/tests/unit/core/test_optional_apps.py` protects that boundary. It runs each combination in its own process. Each probe checks that Django starts, that system checks report nothing, that URLs resolve, and that canonical registration still works. It also checks that no workflow or VDQ module reaches `sys.modules`.

| Configuration                                              | Supported |
| ---------------------------------------------------------- | --------- |
| Required infrastructure alone                              | Yes       |
| Required infrastructure and `vueda.workflow`               | Yes       |
| Required infrastructure, `vueda.workflow`, and `vueda.vdq` | Yes       |
| Required infrastructure and `vueda.vdq`                    | No        |

VDQ depends on workflow, because a queue item's lifecycle is a workflow state machine. `vueda.vdq` raises `ImproperlyConfigured` from its `AppConfig.ready()` when workflow is absent. The dependency runs one way: workflow does not need VDQ.

Workflow may read `vueda.history`, and history never imports workflow. `vueda.core` imports neither, so removing a feature app does not break the base classes.

`vueda.user` works without VDQ. With VDQ installed, the user adapter queues a notification email or SMS as a {@term Queue Item (VDQ)} and a worker delivers it. Without VDQ, the adapter sends the same message inside the request, through Django's mail backend or the Twilio client. The templates and the message content do not change.

### Installation is not model participation

Installing a feature app makes the feature available. Each model then decides whether it takes part, and it declares that in `class Vueda`. [Model Feature Policy](./model-feature-policy) covers the declaration surface.

History tracks every eligible model by default. A model opts out with `History.enabled = False`, and drops columns from its event model with `History.exclude_fields`.

Workflow works the other way. `Workflow.enabled` defaults to `False`, so a model takes part only when it says so. A `Workflow` section in a project that omits `vueda.workflow` is a system-check error, not inert configuration.

Workflow does not read that declaration yet. Participation still follows `HasWorkflowModelMixin`, so a declared `Workflow.enabled` must agree with the model's base classes and a system check reports a disagreement. [Model Feature Policy](./model-feature-policy) records where each feature stands.

A project cannot change the history policy of a model VUEDA ships. That policy lives in VUEDA's own source, and the event models it produced are already in VUEDA's published migrations. A project's own tracked models gain event models in the project's migrations, which `makemigrations` writes.

### Default-on history has a storage cost

`vueda.vdq.QueueItem` is the case to plan for. It extends `VuedaModel`, so history tracks it. VDQ writes one queue item per outbound message and updates that row as delivery proceeds, so a busy queue produces event rows steadily. The `result` field holds provider output, including error text, and each update copies its current value into an event row.

VUEDA ships no retention policy. Event rows accumulate until an integrator removes them, and the append-only trigger blocks an ordinary delete. [Purge Model History](../guides/purge-model-history) covers the supported path.

### Installation is not authorization

Leaving an app out changes what the client can see. A project without workflow exposes no workflow endpoints, so no model advertises a transition and the client renders no transition control. That describes the configuration, not a user's permissions.

The client enforces neither fact. The server checks permissions on every request, whatever the metadata said, as [The Authorization Boundary](#the-authorization-boundary) describes.

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

**A shared cache** holds sessions, the forgot-password cooldown, allauth's sign-in and password reset rate limits, and DRF throttle counters. Every web and worker process has to reach the same one, and it is the one dependency a deployment picks for itself. `CACHE_URL` names the instance, and its scheme selects the backend. The choices are Redis, a database cache table, and a per-process cache for one process. [Configure the Cache and Sessions](../guides/configure-cache-and-sessions) covers the URL forms and the key prefix that separates two deployments sharing one Redis instance. It also covers the `check --deploy` rule reporting a cache that workers cannot share.

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
