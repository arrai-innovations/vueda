---
title: Glossary
type: reference
audience: implementor
status: draft
---

# Glossary

## Action

A named operation exposed by a viewset beyond basic CRUDL, optionally detail-scoped or bulk.

## Action Namespace

The unified client action identifier space that includes CRUDL/extra action names and workflow transition codes.

## Action-Scoped Expand

Per-action expand allow-lists (`permit_{action}_expands`) that define which `expand` keys are valid for a specific action.

## Available Actions

Action list returned by server metadata/object payloads to indicate what is currently permitted.

## Bulk Action

An action dispatched against multiple objects in a single request, enabled on a viewset via `@action(bulk=True)` and routed by `VuedaRouter`.

## Canonical Registration

The server-side registration of serializer/viewset metadata used by model-info endpoints.

## Canonical Serializer

The serializer used in canonical registration that defines model-info field and expand metadata for the model.

## Client Affordance

UI visibility/enablement behavior (for example button visibility), not authorization itself.

## Content Type

Django `ContentType` record identifying a model (`app_label`, `model`) used across VUEDA metadata and workflow wiring.

## CRUDL

`create`, `read`, `update`, `delete`, `list` permission/action vocabulary used by VUEDA.

## CRUDL View Resolution

The client-side mechanism that maps each CRUDL action to a Vue component via `setCrudComponents`, with `ViewActionRouter` selecting the correct component at render time.

## Dry Run

Action execution mode where mutations are rolled back after validation/logic evaluation.

## Expand

Contract option to include related objects inline in API responses.

## Field Subset (`fields`)

Contract option to request a sparse response containing selected fields.

## Formatted Name

A `GeneratedField` on every `VuedaModel` that produces a display-ready string, by default derived from the model's `name` field.

## Implementor

A team integrating VUEDA into a domain application.

## Lookup

A `VuedaModel` subclass with a unique `code` field, intended for lightweight reference data tables (for example, status codes or category labels).

## Model Config

Client-side configuration object (`storeModelConfig`) that controls which fields appear, sort defaults, and per-action overrides for a model's CRUDL views.

## Model Info

Server-provided metadata describing fields, actions, filtering, ordering, and permissions for a model.

## Model-Scope Check

A permission evaluation done without a concrete object instance, used for model-level metadata and admission decisions.

## Model-Scope vs Object-Scope Availability

The contract distinction where `model_actions` advertises model-level action availability and `available_actions` reports per-object availability.

## Permission Mapping

`PERMISSION_NAMES_MAPPING` setting translating Django and VUEDA codename vocabulary.

## Resource

A domain surface implemented across model, serializer, viewset, routing, and client config/UI.

## Row-Level Permissions

Queryset/object checks that constrain which rows a user can `list` and `read` and `update`.

## Row-Level Hook Surface

The row-level extension points (`check_queryset`, `check_instance`, and workflow variants) where project policy can filter rows or override object decisions.

## Row-Level Workflow Permissions

Workflow-aware row-level hooks (`check_instance_workflow`, `check_queryset_workflow`) that combine state and row context; run last and can override any prior permission decision.

## Object-Scope Check

A permission evaluation done with a concrete object instance, used for object-level authorization outcomes and `available_actions`.

## Queue Item (VDQ)

The persistent work record in VDQ that tracks one queued send operation, its workflow state, and processing metadata.

## Route Admission

The client route-guard decision that allows or denies navigation based on declared action semantics, distinct from server authorization.

## Sent Item (VDQ)

The completed-history view of a VDQ queue record used for sent-item listing and resend operations.

## Serializer-Only Registration

Registration via `register_serializer(...)` without a viewset, which exposes metadata discovery but no action/filter/ordering contract.

## Transition

A workflow operation that moves an object from one state to another.

## VDQ (VUEDA Dispatch Queue)

Queue-backed background processing system for deferred/asynchronous work.

## Workflow Overlay

State/transition permission layer that augments baseline model permissions.

## Warning Channel

The non-blocking validation feedback path that carries server warnings into client message state rather than blocking error state.
