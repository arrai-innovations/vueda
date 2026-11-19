---
title: Primary Key and Identifier Discipline
type: explanation
audience: integrator
status: draft
---

# Primary Key and Identifier Discipline

A model's primary key can be `id`, a slug, a UUID, or several columns. A model's viewset can also identify objects by another unique field through DRF's `lookup_field`. VUEDA reads both field names from {@term Model Info}, so no layer assumes `id`. This page describes how the server reports those fields, how identifiers travel between the client and the server, and why choice values are always strings.

## PK Authority and Metadata Source

The server decides which field is the primary key. [`get_model_fields_data`]{@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_fields_data} compares each serializer field name with the model's primary key name, `Meta.model._meta.pk.name`. The matching field gets the {@term Pk Marker}, `pk: true`, in `model_fields`. Other fields carry no `pk` key.

The match is by name only. On a model whose primary key is `slug`, the serializer field `slug` gets the marker, and a field named `id` does not. The marker is absent when the serializer's `Meta.fields` leaves out the primary key or exposes it under another name.

The client reads the marker when it normalizes model info. [Server-Client Metadata Contract](./server-client-metadata-contract.md#client-normalization) describes that step, which sets `pk` on the client's model info to the marked field's name. Without a marker, {@api js:function:@arrai-innovations/vueda/stores/storeModelInfo#storeModelInfo} throws `no pk field found` and caches the error. [Reactive Data Flow](./reactive-data-flow.md#cached-failures) describes that cached failure and when it clears.

## Lookup Field and Object Key

A viewset's [`lookup_field`]{@api ext:drf:rest_framework.generics.GenericAPIView.lookup_field} names the model field whose value DRF puts in the viewset's detail URLs. DRF's default, `"pk"`, is the primary key. VUEDA reads the `lookup_field` of the model's {@term Canonical Viewset} and reports the field's name as `lookup_field` in model info, with `"pk"` resolved to the primary key field's name. A model registered without a viewset reports its primary key field. That field's value is the model's {@term Object Key}.

For a model whose viewset keeps the default, the object key is the primary key, and every identifier on this page is a primary key. For an `Invoice` viewset with `lookup_field = "invoice_sage_id"`, the object key is the `invoice_sage_id` value, such as `SAGE-0042`, and the detail URL is `/invoices/SAGE-0042/`.

The server identifies an object by its object key everywhere that a request names one:

- Detail routes and detail extra actions, such as `history-list`, `activate`, and `deactivate`.
- Single delete and the `pks` body of bulk delete, `activate`, and `deactivate`.
- The `object_id` and `object_ids` values of the workflow endpoints, and the `object_id` of the workflow state history endpoint.

An object change subscription names its record by primary key, because django-object-streams records each change by primary key. The read and update views therefore subscribe to their record only when the model's lookup field is its primary key. A model whose viewset sets another `lookup_field` has no live updates in those views. List views subscribe with their filters instead of a record, so they keep live updates.

A viewset reads its own `lookup_field` for its detail routes, its `pks` bodies, and its `lookup` filter. The workflow and workflow state history endpoints read the `lookup_field` of the model's canonical viewset, which model info reports.

DRF's default detail route matches a URL segment that contains no `/` and no `.`. The workflow endpoints match the same segments. An object key that contains either character reaches neither route, even though the client percent-encodes the key. Choose a lookup field whose values contain neither character.

Values that a relation stores stay relation values. A foreign key in a form, a write payload, or a filter keeps the related row's primary key, or the slug of a slug relation. [Choice-Backed Fields and Lookup Models](../guides/choices-and-lookups.md) describes related fields.

The [`vueda_info.E017`]{@api py:function:vueda.info.checks.check_lookup_field_configuration} system check reports a canonical viewset whose `lookup_field` names no unique concrete field of the model, or names one that allows null. A field is unique when it declares `unique=True`, or when a `UniqueConstraint` without a condition names that field alone. A row that holds null has no URL value. The check also reports a lookup field that the {@term Canonical Serializer} does not return, because the client reads each row's object key from that field.

The [`vueda_info.E018`]{@api py:function:vueda.info.checks.check_filter_query_param_configuration} system check reports a `VuedaFilterSet` subclass that does not keep the `lookup` filter, which matches object keys. A subclass loses the filter when it declares its own `lookup` filter, or removes it with `lookup = None`. It also loses the filter when its `Meta.fields` or `Meta.exclude` asks for a filter on a model field named `lookup`. The client's delete and bulk action views load the selected rows through the `lookup` filter.

## How the Client Uses the Field Names

The client never tells the server which field is the primary key or the lookup field. It uses the names from model info:

- The default field lists that `storeModelConfig` builds leave out the pk field. A lookup field that is not the primary key, such as a slug, stays in them, so a form can edit it.
- The built-in views pass the lookup field name as `pkKey` to the {@term CRUD Adapter} functions, and read each row's object key from that field. The create, detail, list, and update views also add the lookup field to the fields that they request.
- [`defaultObjectUpdate`]{@api js:function:@arrai-innovations/vueda/utils/objectCrud#defaultObjectUpdate} puts the object key from `pk` in the request URL. Without `pk`, it reads the key from the object's [`pkKey`]{@api js:param:@arrai-innovations/vueda/utils/objectCrud#defaultObjectUpdate:args.pkKey} field, which defaults to `"id"`. The built-in update form passes `pk`, so its request body keeps the value that the user submitted for an editable lookup field.
- After an update that changes the lookup field, the update view replaces its route with one that carries the new object key. The view reads its key from that route, so it then retrieves the object by the new key. A view that gets its key from somewhere else, such as a parent component's `pk` prop, keeps the old key. That view must update its own `pk` after the save, for example in its own [`onSubmissionSuccess`]{@api js:property:@arrai-innovations/vueda/use/useObjectForm#ObjectFormInstance.onSubmissionSuccess} hook.

## Identifier Transport

Identifiers travel in three shapes. Each carries object keys under the fixed name `pk` or `pks`, whatever the model's lookup field is called.

**One object: a route parameter.** The detail route of the {@term CRUD Routes}, `/:app/:model/:action/:pk`, carries the object key as `params.pk`. The CRUD adapters place that value, percent-encoded, in the object segment of the {@term Model API Path}, which [`getDetailUrl`]{@api js:function:@arrai-innovations/vueda/utils/urls#getDetailUrl} builds. A {@term Composite Primary Key} travels as its JSON array string, such as `["1","42"]`. [Set Up CRUD for a Composite Primary Key Model](../guides/composite-primary-keys.md) describes that format.

**Several objects: a query value.** When [`getCRUDForTo`]{@api js:function:@arrai-innovations/vueda/router/getCrud#getCRUDForTo} gets an array as `pk`, it targets the list route with one `pk` query value for each key, as in `?pk=4&pk=7`. An empty array targets the list route with no `pk` value. The list route that [`makeCRUDRoutes`]{@api js:function:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes} registers passes the values to the view as an array. A list view's selection actions use this route. The delete and bulk action views load the selected rows through the hidden `lookup` filter that [`LookupInFilterSet`]{@api py:class:vueda.core.filters.LookupInFilterSet} adds to every [`VuedaFilterSet`]{@api py:class:vueda.core.filters.VuedaFilterSet}, as in `?lookup=SAGE-0042&lookup=SAGE-0043`. The request repeats `lookup` once for each key, and the filter never splits a value, so a key that contains a comma stays whole. The filter matches the `lookup_field` of the viewset that serves the request. The `id` filter keeps matching the `id` field.

Neither function splits a value, so a key that contains a comma reaches the view intact. Every composite key contains a comma, and a free-text key can. A link such as `?pk=4,7` therefore selects the single key `4,7`. The list route ignores empty `pk` values and a bare `?pk`. `getCRUDForTo` throws when its `query` argument has a `pk` entry. Code that passes another route's query to `getCRUDForTo` must remove `pk` first.

**Bulk requests: a body key.** [`defaultObjectsDelete`]{@api js:function:@arrai-innovations/vueda/utils/listCrud#defaultObjectsDelete} sends `DELETE` to the model's list path with the body `{ "pks": [...] }`. [`defaultListExecuteAction`]{@api js:function:@arrai-innovations/vueda/utils/listCrud#defaultListExecuteAction} sends the same `pks` body for a {@term Bulk Action}.

The server's bulk delete, activate, and deactivate handlers read the keys with [`ObjectKeyListSerializer`]{@api py:class:vueda.core.serializers.ObjectKeyListSerializer}. It converts each entry through the viewset's lookup field. An integer, UUID, or string key travels as its JSON value. A {@term Composite Primary Key} travels as its JSON array string, the same form as the route parameter. An entry that does not convert answers `400` under `pks`. A key that names no row answers `400` with `Object with key ... does not exist.` under the key as sent. A key that names a row that the user may not change answers the same way. The response therefore does not reveal that the row exists.

The lookup cache in {@api js:function:@arrai-innovations/vueda/use/useLookupContext#useLookupContext} converts each pk to a string before using it as a cache key. The number `42` and the string `"42"` then share one entry.

The ordering parameter `o` accepts `pk` as an alias for the fields behind the primary key. [Filtering and Ordering Semantics](./filtering-and-ordering-semantics.md#ordering-metadata) describes that alias.

## Choice Identifier Value Semantics

Every choice value that VUEDA sends is a string. The rule covers the inline `choices` lists in `model_fields` and `model_filtering`. It also covers the responses of the {@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/} and {@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/} endpoints. For a related model, the value is the related row's pk. For a `SlugRelatedField`, it is the value of the slug field. Integer, UUID, and other column types all arrive as JSON strings.

Filter choices omit empty values, because clearing a filter means leaving its query parameter out. Field choices keep a blank entry when the field declares one, so a form can offer it.

The server sends strings because a filter value reaches it as a query string, which has no number type. A string choice value can match that value directly. For a filter with several active values, {@api vue:component:FilterChip} finds each value's label with strict equality, so a numeric choice value would show as `unknown`. Converting on the server gives every column type one form before any client comparison.

[Choice-Backed Fields and Lookup Models](../guides/choices-and-lookups.md) gives the steps for choice-backed fields. [`ModelInfoChoicesViewSet`]{@api py:class:vueda.info.viewsets.ModelInfoChoicesViewSet} and [`ModelInfoFilterSetChoicesViewSet`]{@api py:class:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet} describe the endpoints.
