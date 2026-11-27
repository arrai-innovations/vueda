---
title: Primary Key and Identifier Discipline
type: explanation
audience: integrator
status: draft
---

# Primary Key and Identifier Discipline

A model's primary key can be `id`, a slug, a UUID, or several columns. A model's viewset can also address objects by another unique field through DRF's `lookup_field`. VUEDA reads both field names from {@term Model Info}, so no layer assumes `id`. This page describes how the server reports those fields, how identifiers travel between the client and the server, and why choice values are always strings.

## PK Authority and Metadata Source

The server decides which field is the primary key. [`get_model_fields_data`]{@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_fields_data} finds the serializer field that returns the primary key value, and gives that field the {@term Pk Marker}, `pk: true`, in `model_fields`. Other fields carry no `pk` key.

The primary key field is usually `Meta.model._meta.pk`. A multi-table inheritance child is different. Its `_meta.pk` is the link to its parent, such as `place_ptr`, and DRF returns that link as the parent object. DRF returns the child's primary key value through the root model's primary key field instead, such as `id`.

A serializer field named after the primary key field gets the marker. On a model whose primary key is `slug`, the serializer field `slug` gets the marker, and a field named `id` does not. When no field has that name, the first field whose value comes from the primary key field gets the marker, such as `key = IntegerField(source="id")`. A field that reads DRF's `pk` attribute gets it too. The marker is absent when the serializer's `Meta.fields` leaves out the primary key.

The [`vueda_info.E019`]{@api py:function:vueda.info.checks.check_lookup_field_configuration} system check reports a {@term Canonical Serializer} that does not return the primary key, because the client identifies each row by that value.

The client reads the marker when it normalizes model info. [Server-Client Metadata Contract](./server-client-metadata-contract.md#client-normalization) describes that step, which sets `pk` on the client's model info to the marked field's name. Without a marker, {@api js:function:@arrai-innovations/vueda/stores/storeModelInfo#storeModelInfo} throws `no pk field found` and caches the error. [Reactive Data Flow](./reactive-data-flow.md#cached-failures) describes that cached failure and when it clears.

## Lookup Field and Lookup Value

A viewset's [`lookup_field`]{@api ext:drf:rest_framework.generics.GenericAPIView.lookup_field} names the model field whose value DRF puts in the viewset's detail URLs. DRF's default, `"pk"`, is the primary key. VUEDA reads the `lookup_field` of the model's {@term Canonical Viewset} and reports the field's name as `lookup_field` in model info. When the lookup field is the primary key, including DRF's `"pk"`, model info reports `null`, and the client uses the field that carries the {@term Pk Marker}. A model registered without a viewset also reports `null`. The lookup field's value is the object's {@term Lookup Value}.

For a model whose viewset keeps the default, the lookup value is the primary key. For an `Invoice` viewset with `lookup_field = "invoice_sage_id"`, the lookup value is the `invoice_sage_id` value, such as `SAGE-0042`, and the detail URL is `/invoices/SAGE-0042/`.

The two values have separate jobs:

- **The lookup value addresses an object.** The server's detail routes and detail extra actions, such as `history-list`, `activate`, and `deactivate`, read it from the URL. Every client route carries it, for one object or for a selection.
- **The primary key identifies an object.** It is the value in request bodies and workflow requests: bulk `pks` bodies, update bodies, the `object_id` and `object_ids` values of the workflow endpoints, and the `object_id` of the workflow state history endpoint. The server keys the warnings and errors of a bulk request by primary key. It keys the error of a single-object `activate` or `deactivate` by primary key too, although that request names the object by its lookup value. An object change subscription names its record by primary key.

A primary key never changes, so a request that names an object by its primary key stays correct after a user edits the lookup field. A route that carries a lookup value stops finding its object after such an edit, as any URL does. An update view that stays on its page after a save that changes the lookup value replaces its detail route with one that carries the saved value.

A page that a route opens loads its rows by lookup value. The read and update views retrieve their record through its detail URL. For a model with a custom lookup field, the delete, action, and transition views load their rows through the hidden `lookup` filter that [`LookupInFilterSet`]{@api py:class:vueda.core.filters.LookupInFilterSet} adds to every [`VuedaFilterSet`]{@api py:class:vueda.core.filters.VuedaFilterSet} and [`VuedaCompositePrimaryKeyFilterSet`]{@api py:class:vueda.core.filters.VuedaCompositePrimaryKeyFilterSet}. Each loaded row carries its primary key, and the page sends that value to the server. When the model's lookup field is its primary key field, the route's values are already the primary keys, and those views load their rows through the hidden `id` filter of [`IdInFilterSet`]{@api py:class:vueda.core.filters.IdInFilterSet}.

When a delete, action, or transition view loads its rows without an error but finds no row for a value in its route, it names that value and disables its confirm button. The view compares a composite key's parts, so the route value `[1, 42]` matches a row whose key is `["1", "42"]`. A row is missing when someone deleted it or changed its lookup value, or when the user may not read it. While any value has no row, the view sends no request, so it never acts on fewer objects than the route names. For a model with a custom lookup field, the view sends the primary keys of the matching rows only, so it never acts on a row that the route does not name. When those rows fail to load, the view shows the error and disables its confirm button, because it has no primary keys to send. For any other model, the route's values are the primary keys, so the view can run its action even when its rows fail to load.

A read or update view subscribes to its record by the record's primary key. For a model whose lookup field is not its primary key field, the view subscribes once it has loaded the record that its route names, by the primary key that the record carries.

The `lookup` filter takes one query value for each lookup value, as in `?lookup=SAGE-0042&lookup=SAGE-0043`. It keeps each value exactly as sent, so a value that contains a comma or a leading or trailing space stays whole. The filter matches the `lookup_field` of the viewset that serves the request. Outside a request, or on an endpoint that filters another model, the filter matches the lookup field of the model's canonical viewset.

DRF's default detail route matches a URL segment that contains no `/` and no `.`. A lookup value that contains either character reaches no detail route, even though the client percent-encodes the value. Choose a lookup field whose values contain neither character.

Values that a relation stores stay relation values. A foreign key in a form, a write payload, or a filter keeps the related row's primary key, or the slug of a slug relation. [Choice-Backed Fields and Lookup Models](../guides/choices-and-lookups.md) describes related fields.

These system checks guard the contract:

- [`vueda_info.E017`]{@api py:function:vueda.info.checks.check_lookup_field_configuration} reports a canonical viewset whose `lookup_field` names no unique concrete field of the model, or names one that allows null. A text field must also reject an empty string, which no URL can carry. A field is unique when it declares `unique=True`, or when a `UniqueConstraint` without a condition names that field alone. The check also reports a lookup field that the canonical serializer does not return, because the client reads each row's lookup value from that field. For a lookup field that is not the primary key, it reports a viewset whose `filterset_class` is missing or is not a `LookupInFilterSet`, because the client loads the rows that a route names through the `lookup` filter.
- [`vueda_info.E018`]{@api py:function:vueda.info.checks.check_filter_query_param_configuration} reports a [`LookupInFilterSet`]{@api py:class:vueda.core.filters.LookupInFilterSet} subclass, such as a `VuedaFilterSet` subclass, that does not keep the `lookup` filter. A subclass loses the filter when it declares its own `lookup` filter, or removes it with `lookup = None`. It also loses the filter when its `Meta.fields` or `Meta.exclude` asks for a filter on a model field named `lookup`.
- `vueda_info.E019` reports a canonical serializer that does not return the primary key.

## How the Client Uses the Field Names

The client never tells the server which field is the primary key or the lookup field. It uses the names from model info:

- The default field lists that `storeModelConfig` builds leave out the pk field. A lookup field that is not the primary key, such as a slug, stays in them, so a form can edit it.
- The built-in views key rows by the primary key, and they pass its name as `pkKey` to the {@term CRUD Adapter} functions. The create, read, and update views and a single-object action address one object through its detail URL, so they pass the lookup field's name as `pkKey`. The create, detail, list, and update views request both fields.
- [`defaultObjectUpdate`]{@api js:function:@arrai-innovations/vueda/utils/objectCrud#defaultObjectUpdate} puts the value of its `pk` argument in the request URL. Without `pk`, it reads the value from the object's [`pkKey`]{@api js:param:@arrai-innovations/vueda/utils/objectCrud#defaultObjectUpdate:args.pkKey} field, which defaults to `"id"`. The built-in update form passes the route's lookup value as `pk`, and its body carries the record's primary key. The body keeps the value that the user submitted for an editable lookup field, so a save of a changed lookup value stores the new value.

## Identifier Transport

Identifiers travel in three shapes. Each uses the fixed name `pk` or `pks`, whatever the model's field is called. A route carries lookup values, and a bulk request body carries primary keys.

**One object: a route parameter.** The detail route of the {@term CRUD Routes}, `/:app/:model/:action/:pk`, carries the object's lookup value as `params.pk`. The CRUD adapters place that value, percent-encoded, in the object segment of the {@term Model API Path}, which [`getDetailUrl`]{@api js:function:@arrai-innovations/vueda/utils/urls#getDetailUrl} builds. A {@term Composite Primary Key} travels as its JSON array string, such as `["1","42"]`. [Set Up CRUD for a Composite Primary Key Model](../guides/composite-primary-keys.md) describes that format.

**Several objects: a query value.** When [`getCRUDForTo`]{@api js:function:@arrai-innovations/vueda/router/getCrud#getCRUDForTo} gets an array as `pk`, it targets the list route with one `pk` query value for each lookup value, as in `?pk=4&pk=7`. An empty array targets the list route with no `pk` value. The list route that [`makeCRUDRoutes`]{@api js:function:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes} registers passes the values to the view as an array. A list view's selection holds the selected rows' lookup values, and its selection actions use this route.

Neither function splits a value, so a key that contains a comma reaches the view intact. Every composite key contains a comma, and a free-text key can. A link such as `?pk=4,7` therefore selects the single key `4,7`. The list route ignores empty `pk` values and a bare `?pk`. `getCRUDForTo` throws when its `query` argument has a `pk` entry. Code that passes another route's query to `getCRUDForTo` must remove `pk` first.

**Bulk requests: a body key.** [`defaultObjectsDelete`]{@api js:function:@arrai-innovations/vueda/utils/listCrud#defaultObjectsDelete} sends `DELETE` to the model's list path with the body `{ "pks": [...] }`, which holds primary keys. [`defaultListExecuteAction`]{@api js:function:@arrai-innovations/vueda/utils/listCrud#defaultListExecuteAction} sends the same `pks` body for a {@term Bulk Action}.

The server's bulk delete, activate, and deactivate handlers read the keys with [`PrimaryKeyListSerializer`]{@api py:class:vueda.core.serializers.PrimaryKeyListSerializer}. It converts each entry through the model's primary key field. An integer, UUID, or string key travels as its JSON value. A {@term Composite Primary Key} travels as its JSON array string, the same form as the route parameter. An entry that does not convert answers `400` under `pks`. A key that names no row answers `400` with `Object with pk=... does not exist.` under the key as sent. A key that names a row that the user may not change answers the same way. The response therefore does not reveal that the row exists.

The lookup cache in {@api js:function:@arrai-innovations/vueda/use/useLookupContext#useLookupContext} converts each pk to a string before using it as a cache key. The number `42` and the string `"42"` then share one entry.

The ordering parameter `o` accepts `pk` as an alias for the fields behind the primary key. [Filtering and Ordering Semantics](./filtering-and-ordering-semantics.md#ordering-metadata) describes that alias.

## Choice Identifier Value Semantics

Every choice value that VUEDA sends is a string. The rule covers the inline `choices` lists in `model_fields` and `model_filtering`. It also covers the responses of the {@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/} and {@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/} endpoints. For a related model, the value is the related row's pk. For a `SlugRelatedField`, it is the value of the slug field. Integer, UUID, and other column types all arrive as JSON strings.

Filter choices omit empty values, because clearing a filter means leaving its query parameter out. Field choices keep a blank entry when the field declares one, so a form can offer it.

The server sends strings because a filter value reaches it as a query string, which has no number type. A string choice value can match that value directly. For a filter with several active values, {@api vue:component:FilterChip} finds each value's label with strict equality, so a numeric choice value would show as `unknown`. Converting on the server gives every column type one form before any client comparison.

[Choice-Backed Fields and Lookup Models](../guides/choices-and-lookups.md) gives the steps for choice-backed fields. [`ModelInfoChoicesViewSet`]{@api py:class:vueda.info.viewsets.ModelInfoChoicesViewSet} and [`ModelInfoFilterSetChoicesViewSet`]{@api py:class:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet} describe the endpoints.
