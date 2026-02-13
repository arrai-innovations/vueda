---
title: Model Choices, Lookup Fields, and Dynamic Options
type: how-to
audience: implementor
status: draft
---

# Model Choices, Lookup Fields, and Dynamic Options

This guide covers the end-to-end flow for loading dynamic option lists — both field-level choices (from serializer/model definitions) and filter-level choices (from filterset definitions) — using VUEDA's info endpoints and client composables. By the end, choice-backed fields and filter lookups will load their options dynamically, respect permissions, and handle edge cases like empty labels and lazy loading.

The guide assumes familiarity with the identifier and metadata contracts. If you have not read [Primary Key and Identifier Discipline](../core-concepts/pk-and-identifier-discipline), start there — it explains how choice values are normalized to strings and why identifier comparison uses string equality. For the model registration and `formatted_name` configuration that choice endpoints depend on, see [Create a CRUDL Surface](./create-crudl-surface#the-formatted_name-contract).

## Goal and Preconditions

The objective is a model surface where:

- Choice-backed fields load their options from the server dynamically, not from hardcoded client-side lists.
- Filter dropdowns load their options from the filter-choices endpoint, with lazy loading where appropriate.
- Permission checks are enforced: field choices require model read permission, and related-model choices additionally require list permission on the related model.
- Choice values arrive as strings regardless of the database column's native type, so client-side comparison works without coercion.

Before you begin, ensure the following are in place:

The model is registered via `register()` with both a canonical serializer and viewset. The model-info endpoint returns complete metadata. If the model has related-model choice fields (foreign keys used as choice sources), the related model must also be registered so the choice endpoint can resolve its content type. The model's `formatted_name` strategy must be configured — choice endpoints use it to resolve display labels for related-model choices. See [Create a CRUDL Surface](./create-crudl-surface#the-formatted_name-contract) for the four `formatted_name` strategies and their serializer wiring requirements.

## Registry and Route Preconditions

Choice endpoints resolve the target model through Django's content type framework, which requires the model to be registered with VUEDA's info registry. An unregistered model — even one with a perfectly defined serializer and viewset — will produce a 404 response from choice endpoints with the message `"Unable to find the content type ..."`.

Registration must happen in the app's `AppConfig.ready()` method. Attempting to wire choice loading before registration (for example, in a module-level initialization) risks content-type resolution errors. If a choice endpoint returns 404 and the model code exists, verify that `register()` is called in `ready()` and that the app is in `INSTALLED_APPS`.

The choice endpoints use two URL patterns:

- **Field choices**: `GET /vueda.info/model_info_choices/{app_label}/{model}/{field}/`
- **Filter choices**: `GET /vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/`

Both require the `app_label` and `model` to match a registered content type, and the `field` to match a valid choice field or filter name on the registered serializer or filterset respectively.

## Field Choice Endpoint Wiring

The field choices endpoint serves option lists for serializer fields that have choices defined — either static choices on the field definition or dynamic choices from a related-model queryset (foreign key fields).

### Permission model

Permission checks differ by choice source type:

- **Static choices** (choices defined directly on the serializer field): the requesting user needs read permission on the source model.
- **Related-model choices** (foreign key fields where choices come from a queryset): the requesting user needs read permission on the source model and list permission on the related model.

If permission checks fail, the endpoint returns 403.

### Invalid field handling

Requesting choices for a field that does not have choices defined returns 404. The response includes a `detail` message that lists the valid choice field names when available, helping diagnose field-name typos or misconfigured serializer definitions.

### Response shape

Choice responses are lists of `{label, value}` objects. For related-model choices, the label is resolved through the `formatted_name` priority chain: `get_formatted_name()` method first, then `formatted_name_lookup_expression` annotation, then the direct `formatted_name` field, then static field choices. The value is normalized to a string regardless of the database column's native type. See [Primary Key and Identifier Discipline](../core-concepts/pk-and-identifier-discipline#choice-identifier-value-semantics) for why this normalization exists.

## Filter Choice Endpoint Wiring

The filter choices endpoint serves option lists for filterset-defined filters — the filters that appear in the list view's filter UI.

### Empty label and empty value

When a filter defines `empty_label`, the endpoint prepends an empty-value entry to the choices list. The empty value comes from the filter's `empty_value` configuration or from the default settings. This entry represents the "no selection" or "all" option in the filter dropdown.

### Permission model

Filter choice permissions follow the same pattern as field choices: model read permission is required, and related-model filters additionally require list permission on the related model.

### Invalid filter handling

Requesting choices for a filter name that does not exist on the filterset returns 404. As with field choices, the response message helps identify valid filter names.

### Response shape

Filter choice responses follow the same `{label, value}` structure as field choices. Values are normalized to strings. For queryset-backed filter choices, the queryset is filtered and paginated according to the filter's configuration before choices are extracted.

## Client Fetch Strategy

The client loads choices through two coordinated layers: `storeModelChoices` for state management and deduplication, and `useModelChoices` for reactive fetching with intent controls.

### `useModelChoices` configuration

`useModelChoices` accepts per-field configuration that controls when and how choices are fetched:

```javascript
const choices = useModelChoices({
  status: {
    app: "myapp",
    model: "order",
    intendToFetch: true,
    isFilter: false,
  },
  category: {
    app: "myapp",
    model: "order",
    intendToFetch: true,
    isFilter: true,
  },
});
```

- **`intendToFetch`**: controls whether the composable fetches choices for this field. When `false`, the field's choices are not loaded. This enables conditional loading — for example, loading choices only when a form section is expanded.
- **`isFilter`**: when `true`, the composable uses the filter-choices endpoint instead of the field-choices endpoint.

The composable does not fetch when the component is inactive (unmounted or deactivated). This prevents background fetches for components that are not visible.

### Store-level deduplication

`storeModelChoices` deduplicates in-flight fetches per `app.model.field` key. If multiple components request choices for the same field simultaneously, only one network request is made. Subsequent requesters receive the same promise and resolve with the same data.

### Filter UI lazy loading

The default filter UI (`FilterComponent`) fetches filter choices lazily — either when the filter dropdown is opened or when the current query already includes a value for that filter. This means filter choices are not loaded on initial page load unless the URL contains filter parameters. Expecting eager availability of filter choices (for example, reading them synchronously after component mount) will produce empty option lists until user interaction triggers the fetch.

## Verification Checklist

With choice loading wired, verify these behaviors:

- Field choice dropdowns load options dynamically from the field-choices endpoint.
- Filter dropdowns load options from the filter-choices endpoint, either on open or when the URL contains a filter value.
- Choice values arrive as strings in the response (inspect the network response).
- Related-model choices show `formatted_name`-derived labels, not raw PKs or `__str__` output.
- A user without read permission on the source model receives 403 from choice endpoints.
- A user without list permission on a related model receives 403 from related-model choice endpoints.
- Requesting choices for an invalid field or filter name returns 404 with a helpful message.
- Empty-label entries appear at the top of filter choice lists when `empty_label` is configured.
- Multiple components requesting the same field's choices do not produce duplicate network requests.

## Troubleshooting

**Choice endpoint returns 404 with "Unable to find the content type".** The model is not registered with VUEDA's info registry. Verify that `register()` is called in the app's `AppConfig.ready()` method with both the serializer and viewset. A `register_serializer`-only registration is not sufficient for choice endpoints.

**Choice endpoint returns 404 for a valid field name.** The field must have choices defined on the serializer — either static choices in the field definition or a related-model queryset source. A plain `CharField` without choices will return 404 from the field-choices endpoint even though it exists in model-info metadata.

**Related-model choice labels show raw values instead of formatted names.** The related model's `formatted_name` strategy is not configured correctly. If the model sets `formatted_name = None`, it must provide either `formatted_name_lookup_expression` or a `get_formatted_name()` method. If using `get_formatted_name()`, the related model's serializer must declare `formatted_name = serializers.SerializerMethodField()`. See [Create a CRUDL Surface](./create-crudl-surface#the-formatted_name-contract) for the configuration options.

**Filter choices are empty on initial page load.** This is expected behavior for lazily-loaded filter choices. The filter UI fetches choices when the dropdown is opened or when the URL already contains a filter value. If you need eager loading, configure `intendToFetch: true` and ensure the component is active at mount time.

**Choice values fail equality checks in the client.** Verify that the client is comparing string values. Choice endpoints normalize values to strings, but if the client holds a numeric PK from a different source (such as a route parameter parsed as a number), the comparison will fail. Coerce both sides to strings before comparing, or rely on the lookup-context manager's built-in string coercion.

**Multiple choice requests fire for the same field.** `storeModelChoices` deduplicates by `app.model.field` key. If the key components differ (for example, different casing of the model name), the store treats them as separate keys and fires separate requests. Ensure consistent `app` and `model` values across all choice-loading call sites.

## Relevant Implementation Surface

- Python:
  - `{@api py:module:vueda.info.registration}`
  - `{@api py:module:vueda.info.viewsets}`
  - `{@api py:class:vueda.info.viewsets.ModelInfoChoicesViewSet}`
  - `{@api py:class:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet}`
  - `{@api py:class:vueda.info.serializers.ModelInfoChoicesSerializer}`
  - `{@api py:class:vueda.info.serializers.ModelInfoFilterSetChoicesSerializer}`
- REST:
  - `{@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/}`
  - `{@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}`
- JavaScript:
  - `{@api js:module:@arrai-innovations/vueda.stores/storeModelChoices}`
  - `{@api js:function:@arrai-innovations/vueda.stores/storeModelChoices.storeModelChoices}`
  - `{@api js:module:@arrai-innovations/vueda.use/useModelChoices}`
  - `{@api js:function:@arrai-innovations/vueda.use/useModelChoices.useModelChoices}`
- Vue.js Components:
  - `{@api vue:component:FilterComponent}`
