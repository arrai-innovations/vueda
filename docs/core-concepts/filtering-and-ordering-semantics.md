---
title: Filtering and Ordering Semantics
type: explanation
audience: integrator
status: draft
---

# Filtering and Ordering Semantics

VUEDA's filtering and ordering contract spans four boundaries: the canonical viewset declares what filters and ordering fields exist, the model-info serializer projects those declarations into metadata payloads, `list` endpoints validate incoming queries against the declared namespace, and the client consumes the metadata to build filter and sort controls. Each boundary enforces a different aspect of the contract, and the observable behaviour depends on all four layers agreeing.

This page explains the authority at each boundary, the metadata shapes that flow between them, the search backend's ranked-search semantics, and the failure surfaces that emerge when layers disagree. For the query parameter names that carry filter and ordering intent, see [Configuration Surface and Defaults](./configuration-surface-and-defaults). For how the client caches and normalizes model-info metadata, see [Reactive Data Flow](./reactive-data-flow). For how filter choices interact with permission boundaries, see [Permission Model](./permission-model). For the broader DRF compatibility boundaries that shape these semantics, see [DRF Ecosystem Compatibility Boundaries](./drf-ecosystem-deviations).

## Contract Boundary and Authority

The filtering and ordering contract begins at the canonical registered viewset. Model-info metadata does not derive filter and ordering information solely from serializer fields; it also reads `filterset_class` and `ordering_fields` from the registered viewset. If a model has no registered viewset (only a serializer), its `model_filtering` and `model_ordering` metadata are empty.

This authority boundary means that adding a field to the serializer does not automatically make it filterable. Filtering requires an entry in the viewset's `filterset_class`. Adding a field to the serializer can make it automatically sortable, providing no `ordering_fields` are defined on the viewset. This reflects the functionality in Django Rest Framework. If `ordering_fields` are defined, then an entry is required in `ordering_fields` to make that field sortable. The metadata projects what is declared; it does not infer capabilities from the data model.

## Metadata Projection for Ordering and Filtering

The {@term Model Info} endpoint projects viewset declarations into structured metadata that clients consume.

Ordering metadata (`model_ordering`) is a list of descriptors, each containing a `name` (the ordering field identifier) and a `type` (the field type classification). The list is derived from the canonical viewset's `ordering_fields`. When no canonical viewset exists, `model_ordering` is empty.

Filtering metadata (`model_filtering`) is richer. Each filter entry includes the filter field name, its type, the list of `lookup_exprs` (lookup expressions such as `in`, `exact`, `contains`), `suffixes` (such as `min` and `max` or `after` and `before`), and choice metadata when the filter field has a bounded value set. {@term Lookup} expressions are always presented as a list, even when only one expression is available. This consistent shape simplifies client parsing; consumers do not need to distinguish between single-expression and multi-expression filters.

Filters that are excluded or disabled in the filterset class are omitted from the metadata projection. The metadata represents only the active, usable filter surface.

Choice metadata for filters follows a two part shape. Static choices (enumeration values defined on the field or filter) are serialized as `{label, value}` entries with values normalized to strings. Queryset-based choices are encoded as `choices: true` plus `app_label`, `model`, and `filterset_name` identifiers, which the client uses to fetch choices dynamically through a separate endpoint, due to the potential for a high volume of data.

## Query Namespace and Validation Boundary

`list` endpoints enforce strict query parameter validation. The accepted query key namespace is the union of: declared filter field names, suffix-derived keys (filter field name plus suffix), framework-level parameters (`s`, `o`, `p`, `ps`, `e`, `f`, `om`), and any keys derived from the filterset's lookup expression configuration. Any query key outside this namespace is rejected with an HTTP 400 response containing a field-keyed validation error: `"Invalid query parameter.  Valid filters are ..."`.

This strict validation is a deliberate departure from upstream DRF, which typically ignores unknown query parameters. VUEDA treats unknown query keys as invalid contract usage rather than silently discarding them. The benefit is that typos and stale client code produce immediate, diagnosable errors rather than returning unfiltered results silently. The cost is that any query parameter not declared in the filterset or framework defaults is an error, which can be surprising when integrating with external tools that append their own query parameters.

Validation runs when the viewset has a `filterset_class`. If no filterset class is defined, the query-parameter namespace check does not apply; only framework-level parameters are meaningful, and unknown keys are ignored.

## Search Contract Surface

Search is a distinct sub-surface of `list` queries, governed by `VuedaSearchFilterBackend`. This backend extends DRF's `SearchFilter` with two capabilities: trigram similarity and ranked search.

The standard DRF search prefixes (`^` for starts-with, `=` for exact, `@` for full-text, `$` for regex) are available. VUEDA adds three additional prefixes: `#` for trigram similarity, `~` for trigram word similarity, and `V:` for VUEDA-specific ranked search fields.

When at least one search field uses the `V:` prefix, the search backend switches to ranked-search mode. In this mode, the backend computes a `combined_rank` by combining full-text search rank, trigram similarity, and word-boundary match scores. Results are filtered by a `search_threshold` and, when no explicit ordering parameter is provided, ordered by `-combined_rank` (best match first). This ranking is suppressed when the user provides an explicit `o` (ordering) parameter, since explicit ordering takes precedence over relevance ranking. Duplicate results will be removed from ranked results.

When at least one search field uses the `#` prefix, the search backend switches to use trigram similarity. In this mode, the backend combines the search term into a single search term, because that is required for trigram similarity.

When no search fields use the `V:` or `#` prefix, the backend falls back to standard DRF `SearchFilter` behaviour. The `V:` prefix is the boundary between deterministic lookups and ranked search; its presence or absence changes the query execution strategy.

## Filter Choices and Permission Surfaces

Dynamic filter choices, the values available for a filter dropdown, are served by a dedicated endpoint that enforces its own validation and permission contracts.

The filter-choice endpoint validates the requested field against the model's declared filter set. An unknown filter field returns an HTTP 404 response with a list of valid filter fields. This strict validation prevents probing for undeclared filters and provides a diagnosable error when the client passes an incorrect field name.

Permission checking for filter choices is bifurcated by source. Static choices (enumeration values) require only `read` permission on the current model. Queryset-based choices (backed by a related model) require both `read` permission on the current model and `list` permission on the related model. This distinction prevents filter choice endpoints from leaking relation values that the user does not have permission to see.

When the related model permission check fails, the endpoint returns HTTP 403, even though the user has `read` permission on the current model and can view the model's list and `detail` views. This can be confusing because the user can see the model's data, but cannot populate a filter dropdown that references a related model.

Queryset-based choice resolution assumes a `formatted_name` lookup path on the related model for display labels. If the related model does not define this path, the endpoint raises an HTTP 500 with `"Cannot resolve keyword 'formatted_name'..."`. A system check (`vueda_info.E001`) catches this misconfiguration for registered models at startup, so the error should be visible in server output before any requests reach the endpoint. This is a server-side configuration error, not a client issue, but it surfaces as a broken filter dropdown.

## Client Normalization and Cache Semantics

The client fetches model-info once per `app.model` key and caches the result in `storeModelInfo`. Filtering and ordering metadata are part of this cached payload and are normalized alongside other model-info fields: nested objects are camelCased, and the overall structure is flattened for consistent client access.

`storeModelConfig` derives sortable field names from `modelInfo.ordering` and maps them to the `o` query parameter for `list` requests. Filter configuration is consumed by `useFilter` and `useFilterForm`, which build the filter UI from the cached `modelInfo.filtering` entries. Choice population for filters uses `storeModelChoices` and `useModelChoices`, which fetch dynamic choices as needed.

Cached model-info errors are sticky. A failed model-info fetch for a given `app.model` key rejects immediately on subsequent attempts without re-fetching. This means that a transient server error during initial model-info load can render the model's filter and sort controls permanently unavailable until the store is reset or the page is reloaded.

The default filter UI uses only the first lookup expression (`lookupExprs[0]`) from each filter's metadata. Multi-lookup-expression selectors are not emitted by default. If a filter declares multiple lookup expressions (for example, `exact` and `icontains`), only the first is wired into the default filter component. A custom filter UI is needed to expose multiple lookup expressions for a single field.

## Composite Primary Key Filtering

Models that use a composite primary key cannot use `VuedaFilterSet` as a filterset base. `VuedaFilterSet` inherits from `IdInFilterSet`, which declares a default `id` filter. Composite primary key models have no `id` field; Django requires their primary key field to be named `pk`, and `id` is not a valid field name on such models.

`VuedaCompositePrimaryKeyFilterSet` is the correct base class for filtersets on composite primary key models. It declares no default filters. Filters for the fields that form the composite key, and any other filterable model fields, must be declared explicitly on the filterset subclass.

## Observable Failure Modes

**Unknown query parameter returns 400.** A typo in a `list` query key, or a stale client sending a filter key that no longer exists in the filterset, produces an HTTP 400 with the message `"Invalid query parameter.  Valid filters are ..."`. The error response includes the valid filter set, which aids diagnosis.

**Ranked search bypassed silently.** If no search fields use the `V:` prefix, the search backend falls through to standard DRF `SearchFilter` behaviour. The symptom is that search results are not ranked by relevance and may not meet expected search quality standards. There is no runtime warning; the fallback is silent.

**Filter choice endpoint returns 404 for unknown fields.** An incorrect field name in a filter-choice request returns 404 with the valid filter set named in the response. This can present as a missing-choices UI state rather than a validation error on the originating `list` view, because the error occurs on a separate endpoint.

**Related model permission blocks filter choices.** Missing `list` permission on a related model causes the filter-choice endpoint to return 403, even when the user can read the current model. The symptom is a filter dropdown that fails to populate while the rest of the model's UI works normally.

**Related model missing `formatted_name`.** If the related model referenced by a queryset-backed filter choice does not implement the `formatted_name` lookup path, the filter-choice endpoint returns 500. A system check (`vueda_info.E001`) catches this for registered models at startup. This is a configuration error on the related model.

**Sticky model-info fetch errors.** A failed model-info fetch caches the error and blocks all subsequent access to that model's filtering and ordering metadata. Retrying the navigation does not trigger a re-fetch.

**Default filter UI uses only first lookup expression.** Filters with multiple declared lookup expressions only expose the first one in the default filter component. The additional expressions are present in the metadata but not rendered. This is a UI limitation, not a metadata issue.

## Relevant Implementation Surface

- {@api rest:endpoint:GET:/vueda.info/model_info/}
- {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}
- {@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}
- {@api py:class:vueda.info.serializers.ModelInfoSerializer}
- {@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_filtering}
- {@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_ordering}
- {@api py:class:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet}
- {@api py:function:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet.get_queryset}
- {@api py:function:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet.validate_queryset}
- {@api py:module:vueda.core.filters}
- {@api py:class:vueda.core.filters.VuedaSearchFilterBackend}
- {@api py:class:vueda.core.filters.VuedaCompositePrimaryKeyFilterSet}
- {@api py:function:vueda.info.viewsets.ModelInfoChoicesBaseViewSet.check_permissions}
- {@api py:class:vueda.core.viewsets.NoExtraFieldsForViewSetMixin}
- {@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.list}
- {@api js:module:@arrai-innovations/vueda/stores/storeModelInfo}
- {@api js:module:@arrai-innovations/vueda/stores/storeModelConfig}
- {@api js:module:@arrai-innovations/vueda/stores/storeModelChoices}
- {@api js:module:@arrai-innovations/vueda/use/useFilter}
- {@api js:module:@arrai-innovations/vueda/use/useFilterForm}
- {@api js:module:@arrai-innovations/vueda/use/useModelChoices}
- {@api js:property:@arrai-innovations/vueda/utils/constants#ORDERING_PARAM}
- {@api js:property:@arrai-innovations/vueda/utils/constants#SEARCH_PARAM}
- {@api vue:component:ViewList}
- {@api vue:component:FilterGroup}
- {@api vue:component:FilterMenu}
- {@api vue:component:FilterChip}
- {@api vue:component:FilterFieldForm}
