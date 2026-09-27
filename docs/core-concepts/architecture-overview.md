---
title: Architecture Overview
type: explanation
audience: integrator
status: draft
---

# Architecture Overview

VUEDA is a framework for admin-style {@term CRUD} applications. A Django server defines models, serializers, and viewsets. A Vue client reads those definitions at runtime as {@term Model Info} and builds routes, forms, and views from them. An application starts from a working CRUD surface with no per-model client code, and you customize the views that need it.

Authority splits along the network boundary. The server decides data integrity, permissions, and the shape of the metadata. The client decides rendering, form state, and which routes to open. This page describes the layers on each side, the Django apps and infrastructure they need, and which pages describe each topic in depth.

## Server Responsibility Layers

The server has four responsibility layers. Each layer builds on the ones below it.

### Domain infrastructure

`vueda.core` defines the base classes a domain module builds on: {@api py:class:vueda.core.models.VuedaModel}, {@api py:class:vueda.core.serializers.VuedaSerializer}, and {@api py:class:vueda.core.viewsets.VuedaViewSet}. A module that extends them gets VUEDA's request handling without further setup. {@api py:class:vueda.core.serializers.NoExtraFieldsSerializerMixin} rejects unknown fields in a write, and {@api py:class:vueda.core.viewsets.NoExtraFieldsForViewSetMixin} rejects unknown query parameters. [Filtering and Ordering Semantics](./filtering-and-ordering-semantics) describes the rejection rules.

`VuedaViewSet` also filters `list` results by row-level permissions, allows only declared [expands]{@term Expand}, and adds bulk delete with a [dry run]{@term Dry Run}. VUEDA's validation code raises {@api py:class:vueda.core.exceptions.VuedaValidationError}, whose payload the client maps onto form fields. [Field and Expand Semantics](./field-and-expand-semantics), [Row-Level Permission Filtering](./row-level-permission-filtering), and [Error and Validation Contract](./error-and-validation-contract) describe each behavior. [DRF Ecosystem Compatibility Boundaries](./drf-ecosystem-deviations) lists where these defaults depart from plain DRF.

{@api py:function:vueda.core.default_settings.get_defaults} builds a project's Django settings from its config file or environment. It sets the installed apps, the DRF defaults, the database and cache, and the wire names of VUEDA's query parameters. Some of its defaults are security-sensitive, and a project can override any of them. [Configuration Surface and Defaults](./configuration-surface-and-defaults) describes each group of settings and the client's own configuration surface.

### Metadata and discovery

`vueda.info` publishes model info for each registered model. It derives fields, actions, [expands]{@term Expand}, filters, ordering, and permissions from the model, serializer, viewset, and filterset. The server filters the metadata for the requesting user, so two users can see different actions for the same model. [Server-Client Metadata Contract](./server-client-metadata-contract) describes each section of model info and the key names on each side. [Convention Over Configuration](#convention-over-configuration) describes how a model gets metadata.

### Stateful lifecycle

`vueda.workflow` gives a model a state machine. The server enforces each [transition]{@term Transition} and publishes the user's [permitted transitions]{@term Permitted Transitions} in metadata, so a model's actions change with the object's state. State permission rules can also grant or deny ordinary actions per state. [Workflow as a Permission Overlay](./workflow-permission-overlay) describes those rules and how they combine with model permissions.

`vueda.vdq` is the [VUEDA Dispatch Queue]{@term VDQ (VUEDA Dispatch Queue)}. It stores each outbound email or SMS as a {@term Queue Item} with a workflow state, and a Celery worker sends it. Provider callbacks record the delivery result on the same item. [VDQ and Background Work Model](./vdq-and-background-work) describes the queue item lifecycle and its transaction boundaries. Both apps are optional; [Django App Boundaries](#django-app-boundaries) gives the supported combinations.

### Cross-cutting concerns

`vueda.user` handles sign-in, sessions, and [two-factor authentication]{@term Two-Factor Authentication}. With VDQ installed, its adapter sends notification email and SMS as queue items. Without VDQ, it sends the same messages during the request.

`vueda.history` keeps {@term Model History} for every {@term VUEDA Model} through PostgreSQL triggers. A model opts out or excludes fields through its {@term Feature Policy}. `VuedaViewSet` carries the history endpoint and `VuedaSerializer` publishes each object's revision, so a domain module needs no history-specific base class.

`vueda.release` serves the application's release notes.

## Django App Boundaries

The server ships seven Django apps, and `get_defaults()` puts all seven in `VUEDA_APPS`. Every supported configuration installs five required apps: `vueda.core`, `vueda.info`, `vueda.user`, `vueda.release`, and `vueda.history`. `get_defaults()` raises {@api ext:django:django.core.exceptions.ImproperlyConfigured} when `VUEDA_APPS` omits `vueda.history`, because the migrations of every app with a tracked model depend on pghistory. `vueda.workflow` and `vueda.vdq` are optional. VDQ needs workflow, because a queue item's lifecycle is a workflow state machine, and `vueda.vdq` raises `ImproperlyConfigured` at startup without it.

| Configuration                                    | Supported |
| ------------------------------------------------ | --------- |
| Required apps alone                              | Yes       |
| Required apps and `vueda.workflow`               | Yes       |
| Required apps, `vueda.workflow`, and `vueda.vdq` | Yes       |
| Required apps and `vueda.vdq`                    | No        |

Installing a feature app makes the feature available, and each model's feature policy decides whether the model takes part. History tracks every VUEDA model unless it opts out, workflow applies only to models that opt in, and [Model Feature Policy](./model-feature-policy) describes both declarations. [Purge Model History](../guides/purge-model-history) describes the storage that history accumulates and how to remove old rows.

## Client Responsibility Layers

The client is a Vue single-page application. It derives a default UI from model info, and you override the parts that need it. It has five layers.

### Metadata consumption

Pinia stores fetch and cache the server's metadata. {@api js:module:@arrai-innovations/vueda/stores/storeModelInfo} holds model info per model. {@api js:module:@arrai-innovations/vueda/stores/storeModelConfig} merges it with the project's {@term Model Config} overrides into one config per view. These are [auth-scoped stores]{@term Auth-Scoped Stores}, so the client reads a model's metadata once and refetches it after a page reload or a change of user. [Reactive Data Flow](./reactive-data-flow) describes the store lifecycles, their cache keys, and the composables that read them.

### Routing and gating

Every model shares one set of {@term CRUD Routes}. Before a view mounts, {@term Route Admission} loads the model's metadata through {@api js:function:@arrai-innovations/vueda/router/guards#requireModelInfo}. It opens the route only for an action the server lists for the user, or for one of the user's permitted transitions. [Routing and View Resolution Model](./routing-and-view-resolution-model) describes the guard chain, what happens when a guard rejects a route, and how the view is chosen.

### UI generation

Composables turn each field's metadata into a form model. Every field renders as {@api vue:component:FormField}, which wraps a {@term Widget} chosen from type mapping tables. Model config overrides and component props change the field, widget, or props for the views that need it. [Contract-First Dynamic UI](./contract-first-dynamic-ui) describes field and widget resolution and the precedence between metadata, model config, and props.

### Data operations

The list and object composables from reactive-helpers send no requests themselves. Each operation calls a {@term CRUD Adapter}, and VUEDA's adapters speak its REST API. A generated project registers them at startup, and you can replace any adapter for every instance or for one. [CRUD Adapter Layer](./crud-adapter-layer) describes the registries, what each adapter sends, and the contract a replacement meets.

The adapters return a {@term Cancellable Promise}. The list and object instances cancel a running request when its parameters change or its component goes away, and a cancelled run records no error. Store requests carry no `cancel()`. [Cancellable Network Operations](./cancellable-network-operations) describes what a cancel aborts and what it only ignores.

### Rendering

View components ({@api vue:component:ViewList}, {@api vue:component:ViewCreate}, {@api vue:component:ViewRead}, and {@api vue:component:ViewUpdate}) render the generated forms with VUEDA's own controls, built on Reka UI. {@api vue:component:ViewActionRouter} picks the view for each route through {@term Action View Resolution}, which also finds a project's own view by naming convention.

## Runtime Topology

The web process serves HTTP requests: CRUD, metadata, workflow transitions, authentication, and provider callbacks. `get_defaults()` turns on {@api ext:django:setting:DATABASE-ATOMIC_REQUESTS}, so each request runs in one transaction, and an exception in a DRF view rolls back its writes. [Configuration Surface and Defaults](./configuration-surface-and-defaults) gives the full transaction rule.

The worker process runs Celery tasks: email delivery, SMS delivery, and periodic status checks. It shares the web process's database, cache, and Django settings, but it has no request, user, or middleware. The worker moves queue items between states with a {@term Fast Transition}, which skips permission checks.

The browser client reaches the server only through its REST endpoints. It has no access to the database, cache, or worker. [Issue #246](https://github.com/arrai-innovations/vueda/issues/246) tracks production deployment documentation for these processes.

## Architectural Dependencies

Every VUEDA deployment needs PostgreSQL and a shared cache. A broker and message providers depend on the apps and features a project uses.

**PostgreSQL** is the only supported database. History records changes through PostgreSQL triggers (pgtrigger and pghistory), and list search uses full-text search and trigram similarity. VUEDA also relies on array fields, range fields, GIN indexes, and generated columns.

**A shared cache** holds sessions and rate-limit state for every web and worker process. `CACHE_URL` names the instance. [Configure the Cache and Sessions](../guides/configure-cache-and-sessions) describes what the cache holds, the supported backends, and the deployment checks.

**A message broker**, such as RabbitMQ or Redis, is needed when `vueda.vdq` is installed. It carries VDQ's tasks from the web process to the worker. {@api py:function:vueda.vdq.schedulers.schedule_queue_item} publishes each task after the transaction commits. When the publish fails, the queue item moves to `errored` with the exception in its `result`.

**Email and SMS providers** are needed only when the application sends messages. Email goes through the Django mail backend the project configures, such as an Anymail backend, and SMS goes through Twilio.

## Convention Over Configuration

{@term Canonical Registration} decides whether a model takes part in the framework. A model registered with {@api py:function:vueda.info.registration.register} gets model info, routes, forms, permission gating, and action availability. A model registered with {@api py:function:vueda.info.registration.register_serializer} gets partial metadata, as {@term Serializer-Only Registration} describes. A model that is not registered gets none of these. [Canonical Registration and Model Discovery](./canonical-registration-and-discovery) describes the registration states, when to register, and the failures a missing registration causes.

The client holds no list of models, fields, or actions, so a change to the server contract needs no client code change.

Registration checks only the serializer's model, so a registered viewset that does not extend `VuedaViewSet` still appears in model info. That viewset loses VUEDA's viewset behavior: query parameter validation, row-level `list` filtering, bulk actions, and the history endpoint. DRF applies the default permission class, {@api py:class:vueda.core.permissions.ObjectPermissions}, to any view that does not set its own.

## The Authorization Boundary

The server authorizes every request on its own, whatever the metadata said. Model info reflects the user's permissions, and the client uses it to decide which routes open and which controls appear. A route the client does not open or a button it hides is a {@term Client Affordance}. A user who calls the API directly still meets every server check. Leaving an optional app out changes what the client can show, for example no transition controls without workflow, and it grants or removes no permission. [Authorization vs UI Semantics](./authorization-vs-ui-semantics) describes where the two sides get their action sets, and [Permission Model](./permission-model) describes the server's permission layers.
