---
title: Glossary
type: reference
audience: implementor
status: draft
---

# Glossary

## Action

A named operation exposed by a viewset beyond basic CRUDL, optionally detail-scoped or bulk.

## Available Actions

Action list returned by server metadata/object payloads to indicate what is currently permitted.

## Canonical Registration

The server-side registration of serializer/viewset metadata used by model-info endpoints.

## Client Affordance

UI visibility/enablement behavior (for example button visibility), not authorization itself.

## Content Type

Django `ContentType` record identifying a model (`app_label`, `model`) used across VUEDA metadata and workflow wiring.

## CRUDL

`create`, `read`, `update`, `delete`, `list` permission/action vocabulary used by VUEDA.

## Dry Run

Action execution mode where mutations are rolled back after validation/logic evaluation.

## Expand

Contract option to include related objects inline in API responses.

## Field Subset (`fields`)

Contract option to request a sparse response containing selected fields.

## Implementor

A team integrating VUEDA into a domain application.

## Model Info

Server-provided metadata describing fields, actions, filtering, ordering, and permissions for a model.

## Permission Mapping

`PERMISSION_NAMES_MAPPING` setting translating Django and VUEDA codename vocabulary.

## Resource

A domain surface implemented across model, serializer, viewset, routing, and client config/UI.

## Row-Level Permissions

Queryset/object checks that constrain which rows a user can `list` and `read` and `update`.

## Row-Level Workflow Permissions

Workflow-aware row-level hooks (`check_instance_workflow`, `check_queryset_workflow`) that combine state and row context; run last and can override any prior permission decision.

## Transition

A workflow operation that moves an object from one state to another.

## VDQ (VUEDA Dispatch Queue)

Queue-backed background processing system for deferred/asynchronous work.

## Workflow Overlay

State/transition permission layer that augments baseline model permissions.
