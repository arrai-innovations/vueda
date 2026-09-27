---
title: DRF Ecosystem Compatibility Boundaries
type: explanation
audience: integrator
status: draft
---

# DRF Ecosystem Compatibility Boundaries

VUEDA's server builds on DRF, django-filter, drf-flex-fields, and drf-writable-nested. Its defaults change some of their behavior. A client written for plain DRF meets different parameter names, stricter validation, and different response bodies. This page lists each departure briefly and links the page that describes it.

## Query Parameter Names

DRF's {@api ext:drf:rest_framework.filters.SearchFilter} and {@api ext:drf:rest_framework.filters.OrderingFilter} read `search` and `ordering` by default, and drf-flex-fields reads `expand`, `fields`, and `omit`. VUEDA sets short names for these and for pagination and column totals: `s`, `o`, `p`, `ps`, `e`, `f`, `om`, and `ct`. These are the {@term Wire Query Parameters}. The client holds each name as a constant, so a rename on the server needs the same change on the client. [Configuration Surface and Defaults](./configuration-surface-and-defaults#wire-query-parameter-namespace) lists each name with its server setting and client constant.

## Default Filter Backends

DRF configures no filter backend by default. VUEDA's `REST_FRAMEWORK` defaults run three on every `list` endpoint, in this order:

1. {@api py:class:vueda.core.filters.VuedaOrderingFilter} extends `OrderingFilter`. It applies a view's nulls placement to requested ordering, and it accepts every field in the view's default ordering as an `o` value.
2. {@api py:class:vueda.core.filters.VuedaSearchFilterBackend} extends `SearchFilter` with the search prefixes `#` (trigram similarity), `~` (word similarity), and `V:` (ranked search). It runs after ordering so that ordering does not reorder ranked results.
3. django-filter's [`DjangoFilterBackend`](https://django-filter.readthedocs.io/en/stable/guide/rest_framework.html) applies the viewset's `filterset_class`.

A viewset that sets its own `filter_backends` replaces this list. [Filtering and Ordering Semantics](./filtering-and-ordering-semantics) describes each backend's rules.

## Unknown Input Returns 400

DRF ignores query parameters a view does not read and request body keys a serializer does not declare. VUEDA answers both with a `400` validation error that names the valid choices:

- {@api py:class:vueda.core.viewsets.NoExtraFieldsForViewSetMixin}, part of {@api py:class:vueda.core.viewsets.VuedaViewSet} and {@api py:class:vueda.core.viewsets.VuedaReadOnlyViewSet}, rejects any query key that `list` or `retrieve` does not accept. It also rejects `f` and `e` values that name no field or expand. [Filtering and Ordering Semantics](./filtering-and-ordering-semantics) describes these [validation rules]{@term Query Parameter Validation}.
- {@api py:class:vueda.core.serializers.NoExtraFieldsSerializerMixin}, part of {@api py:class:vueda.core.serializers.VuedaSerializer}, rejects top-level body keys the serializer does not declare. It checks only the view's own serializer class, so keys inside a nested payload are not checked. [Error and Validation Contract](./error-and-validation-contract) describes the error body.

A typo or a stale client gets an error that names the valid keys. An integration that adds its own query parameters or body keys fails until the viewset or serializer declares them.

## Response Bodies and Authentication

VUEDA's defaults change these responses and the accepted credentials:

- **List pagination.** {@api py:class:vueda.core.pagination.VUEDAPageNumberPagination} returns `results`, `columnTotals`, `perPage`, `totalPages`, and `totalRecords`. DRF's {@api ext:drf:rest_framework.pagination.PageNumberPagination} returns `count`, `next`, `previous`, and `results`. [Expose Aggregates in `list` Responses](../guides/list-column-totals) describes `columnTotals`.
- **Error bodies.** {@api py:function:vueda.core.exceptions.debug_stack_exception_handler} moves a list of errors under `non_field_errors`, and returns a JSON `500` for exceptions DRF does not handle. It adds `serverStack` to every error body, except the `409` of {@term Warning Confirmation}. [Error and Validation Contract](./error-and-validation-contract) describes these shapes.
- **Durations.** {@api py:class:vueda.core.renderers.VuedaJSONRenderer} renders a `timedelta` that reaches it as a number of seconds, where DRF renders a string. This affects values that bypass serializer fields, such as a duration column total. A serializer `DurationField` still returns its string form.
- **Authentication.** DRF's {@api ext:drf:rest_framework.authentication.SessionAuthentication} is the only authentication class. A client sends the session cookie, and writes also need the CSRF token.

## Registration Gates Model Info

In plain DRF, a viewset and a router entry give a model its REST API. VUEDA's {@term Model Info} endpoints also require the model's {@term Canonical Registration} through {@api py:module:vueda.info.registration}. A model with a viewset but no registration has a REST API but no model info, which the default UI needs to build its views. [Canonical Registration and Model Discovery](./canonical-registration-and-discovery) describes registration.

## Flex Fields with Nested Writes

`VuedaSerializer` combines drf-flex-fields expansion with drf-writable-nested writes. [Field and Expand Semantics](./field-and-expand-semantics) describes {@term Expand} and {@term Sparse Fields}. [Nested Write Compatibility](./nested-write-compatibility) describes what changes when the two packages share one serializer.

## Composite Primary Keys

`VuedaSerializer` maps Django's {@api ext:django:django.db.models.CompositePrimaryKey} to {@api py:class:vueda.core.serializers.fields.CompositePrimaryKeyField} without a field declaration. [`VuedaViewSet.get_object`]{@api py:function:vueda.core.viewsets.VuedaViewSet.get_object} reads the key from the URL as a JSON list. [Set Up CRUD for a Composite Primary Key Model](../guides/composite-primary-keys) gives the URL format and how to pass the key to {@api ext:django:django.urls.reverse}.
