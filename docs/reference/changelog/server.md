---
title: Server
type: reference
audience: integrator
status: draft
---

# Server Changelog

Integrator-facing changes for the `vueda` Python package.

Use this page for changes that affect server package consumers: Django apps, settings, serializers, viewsets,
permissions, metadata responses, management commands, migrations, REST behavior, and compatibility notes.

## Public Baseline

Earlier VUEDA server versions existed for internal or private use. The v3 prerelease series is the first
public-facing documentation baseline.

## vNext (unreleased)

### Breaking Changes

- **File and image field representation**:
    - `VuedaSerializer` now maps `models.FileField` and `models.ImageField` columns to VUEDA's serializer fields, which represent a stored file as `{"name": ..., "url": ...}` (with an absolute `url` when a request is in context) instead of DRF's plain URL string. This applies to any file or image column auto-built by a VUEDA serializer.
      _Update client or integration code that read a bare URL string from these fields. The v3 client widgets (`WidgetFile`, `WidgetImage`) already consume the `{name, url}` shape. To keep the previous plain-string behavior on a specific field, declare a stock `rest_framework.serializers.FileField`/`ImageField` explicitly on your serializer._

### Features

- **`ImageField` serializer field**:
    - Added `vueda.core.fields.serializers.ImageField`, the image counterpart to the existing `FileField`. It shares the `{"name", "url"}` representation and subclasses `FileField` rather than DRF's `ImageField`, so it does not require Pillow; image content validation is left to the model field and upload pipeline.

## v3.0.0a0 (2026-05-27)

### Migration Summary

This is the first public-facing v3 server baseline. The major migration work is around the metadata contract,
composite primary key support, permissions/workflow tooling, more predictable REST error shapes, and generated API
documentation.

Review any application code that customizes VUEDA serializers, viewsets, filtersets, workflow/group migration
commands, password reset flows, search behavior, or model metadata consumed by the client.

### Breaking Changes

- **Object payload `available_actions`**:
    - `VuedaSerializer` now removes `available_actions` from ordinary object responses unless the sparse field request explicitly includes it.
      _Review client or integration code that read `available_actions` directly from ordinary object payloads. Request the field explicitly or use the metadata/action-contract surfaces instead._
- **Composite primary key models**:
    - Composite primary key support now uses dedicated serializer, filterset, and URL conversion behavior.
      _For composite primary key models, use VUEDA's composite primary key serializer/filterset path instead of assuming the default integer `pk` filter._
- **Password reset and error response shapes**:
    - Password reset and unhandled error responses now follow DRF-style `detail` and field-error shapes more consistently.
      _Review code that matched older `result` / `message` or `error` response keys._

### Features

- **Server version endpoint**:
    - Added documented server version metadata so the docs and client can identify which server package version they are paired with.
- **Metadata contract improvements**:
    - Serializer and model-info output now exposes more of the contract needed by the v3 client, including hidden field metadata and cleaner generated API documentation.
- **Composite primary key support**:
    - Added support for serializing, filtering, URL parsing, and documenting composite primary key models.
- **Search and filtering**:
    - Expanded `VuedaSearchFilterBackend` support for ranked search, trigram similar lookups, word-similar lookups, deterministic ordering, and distinct handling.
- **Group and workflow migration tooling**:
    - Improved group and workflow migration commands so permission and workflow changes can be captured and replayed more reliably.
- **VDQ and async dependencies**:
    - Added `channels` as a runtime dependency and updated async/background-work related server dependencies for the v3 package set.

### Fixes

- **REST error consistency**:
    - Unhandled server errors now return a `detail` key, 404 responses use a DRF-style `detail` payload, and `ImproperlyConfigured` errors are converted into client-readable validation details.
- **Forgot-password flow**:
    - Forgot-password now validates the submitted email through serializer data, returns 204 on success, returns field errors for inactive or missing users, and returns `detail` for rate limiting.
- **Ranked search distinct handling**:
    - Ranked search now preserves ordering and primary-key tie-breaking when distinct results are required.
- **Expanded history fields**:
    - History field filtering now respects wildcard field selection when applying flex-like omit/field controls to historical records.
- **Workflow permission messages**:
    - Transition attempts without permissions now return a clearer message for the client to display.
