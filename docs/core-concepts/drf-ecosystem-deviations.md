---
title: DRF Ecosystem Compatibility Boundaries
type: explanation
audience: implementor
status: briefing
---

# DRF Ecosystem Compatibility Boundaries

## Intent and Scope

- Define where VUEDA intentionally diverges from DRF/DRF-ecosystem defaults to preserve a contract-first, metadata-driven system. Source anchors: `server/vueda/core/default_settings.py#L249`, `server/vueda/core/viewsets/__init__.py#L128`, `server/vueda/core/serializers/__init__.py#L30`.
- Define the authority points that enforce those boundaries: server defaults, canonical registration, and view/serializer validation mixins. Source anchors: `server/vueda/core/default_settings.py#L249`, `server/vueda/info/registration.py#L8`, `server/vueda/core/viewsets/__init__.py#L128`.
- Act as a hub for the focused compatibility explainers.

## Non-goals

- Not a how-to for composing requests or choosing query parameter values.
- Not a per-model inventory of filters, expands, fields, or actions.
- Not a restatement of focused contracts. See: `docs/core-concepts/filtering-and-ordering-semantics.md`, `docs/core-concepts/field-and-expand-semantics.md`, `docs/core-concepts/error-and-validation-contract.md`, `docs/core-concepts/nested-write-compatibility.md`, `docs/core-concepts/server-client-metadata-contract.md`.

## Key Concepts

### Contract-first defaults override upstream assumptions

- What it is: VUEDA defines canonical query parameter keys and default filter backends rather than inheriting DRF defaults. Source anchors: `server/vueda/core/default_settings.py#L249`.
- Upstream vs VUEDA: upstream DRF conventions commonly use `search`/`ordering` query keys, while VUEDA binds search and ordering to `s` and `o` (plus flex keys `e`/`f`/`om`) via server defaults. Source anchors: `server/vueda/core/default_settings.py#L249`, `server/vueda/core/default_settings.py#L265`.
- Why it exists: a single canonical keyset is enforced at the server defaults layer. Source anchors: `server/vueda/core/default_settings.py#L249`.
- Where it lives: `REST_FRAMEWORK` and `REST_FLEX_FIELDS` defaults. Source anchors: `server/vueda/core/default_settings.py#L249`.

### Canonical registration gates metadata authority

- What it is: a registry maps `app_label.model` to a canonical serializer and optional viewset. Source anchors: `server/vueda/info/registration.py#L37`, `server/vueda/info/registration.py#L43`.
- Upstream vs VUEDA: upstream DRF does not define a first-class registry for model metadata projection, while VUEDA’s model-info surfaces are gated to registered content types and consult the registration mapping for canonical serializer/viewset authority. Source anchors: `server/vueda/info/viewsets.py#L53`, `server/vueda/info/viewsets.py#L62`, `server/vueda/info/viewsets.py#L109`, `server/vueda/info/registration.py#L43`.
- Why it exists: explicit registration defines which serializer/viewset pair is authoritative for metadata and contract derivation. Source anchors: `server/vueda/info/registration.py#L13`, `server/vueda/info/registration.py#L64`.
- Where it lives: `vueda.info.registration` registry. Source anchors: `server/vueda/info/registration.py#L8`.

### Reject-unknown inputs at view and serializer boundaries

- What it is: list viewsets validate query keys and top-level serializers validate extra payload keys instead of ignoring them. Source anchors: `server/vueda/core/viewsets/__init__.py#L223`, `server/vueda/core/serializers/__init__.py#L40`.
- Upstream vs VUEDA: upstream DRF request parsing does not enforce unknown-query-key rejection and serializer input processing commonly tolerates extra keys, while VUEDA enforces explicit rejection at the list-query boundary and at the top-level serializer boundary. Source anchors: `server/vueda/core/viewsets/__init__.py#L223`, `server/vueda/core/serializers/__init__.py#L40`.
- Why it exists: contract surfaces are explicit; unknown inputs are treated as invalid. Source anchors: `server/vueda/core/viewsets/__init__.py#L223`, `server/vueda/core/serializers/__init__.py#L30`.
- Where it lives: `NoExtraFieldsForViewSetMixin` and `NoExtraFieldsSerializerMixin`. Source anchors: `server/vueda/core/viewsets/__init__.py#L128`, `server/vueda/core/serializers/__init__.py#L30`.

## Relevant Implementation Surface

- `{@api py:module:vueda.core.default_settings}`
- `{@api py:module:vueda.info.registration}`
- `{@api py:module:vueda.core.viewsets}`
- `{@api py:class:vueda.core.viewsets.NoExtraFieldsForViewSetMixin}`
- `{@api py:module:vueda.core.serializers}`
- `{@api py:class:vueda.core.serializers.NoExtraFieldsSerializerMixin}`

## Contracts and Invariants

- Canonical query parameter keys (`s`, `o`, `e`, `f`, `om`, `p`, `ps`) are set by server defaults, not DRF defaults. Source anchors: `server/vueda/core/default_settings.py#L249`.
- Default filter backends include `VuedaSearchFilterBackend`, `OrderingFilter`, and `DjangoFilterBackend` as the standard list-query surface. Source anchors: `server/vueda/core/default_settings.py#L265`.
- List endpoints reject unknown query params when `filterset_class` is present. Source anchors: `server/vueda/core/viewsets/__init__.py#L223`.
- Top-level serializer validation rejects extra payload keys. Source anchors: `server/vueda/core/serializers/__init__.py#L40`.

## Footguns

- A typo in a list query key can surface as HTTP 500 (`Invalid query parameter`) instead of a 4xx validation response. Source anchors: `server/vueda/core/viewsets/__init__.py#L223`.
- Extra request payload keys trigger field-keyed validation errors at the top-level serializer boundary; nested serializer payload drift is not validated here. Source anchors: `server/vueda/core/serializers/__init__.py#L40`.

## Suggested Outline

- `## Boundary and Authority`
- `## Default Namespace and Backends`
- `## Validation Surfaces`
- `## Compatibility Boundaries`
- `## Observable Failure Modes`
