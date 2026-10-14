---
title: Primary Key and Identifier Discipline
type: explanation
audience: integrator
status: draft
---

# Primary Key and Identifier Discipline

A model's primary key can be `id`, a slug, a UUID, or several columns. VUEDA reads the primary key field's name from {@term Model Info}, so no layer assumes `id`. This page describes how the server marks that field, how identifiers travel between the client and the server, and why choice values are always strings.

## PK Authority and Metadata Source

The server decides which field is the primary key. [`get_model_fields_data`]{@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_fields_data} compares each serializer field name with the model's primary key name, `Meta.model._meta.pk.name`. The matching field gets the {@term Pk Marker}, `pk: true`, in `model_fields`. Other fields carry no `pk` key.

The match is by name only. On a model whose primary key is `slug`, the serializer field `slug` gets the marker, and a field named `id` does not. The marker is absent when the serializer's `Meta.fields` leaves out the primary key or exposes it under another name.

The client reads the marker when it normalizes model info. [Server-Client Metadata Contract](./server-client-metadata-contract.md#client-normalization) describes that step, which sets `pk` on the client's model info to the marked field's name. Without a marker, {@api js:function:@arrai-innovations/vueda/stores/storeModelInfo#storeModelInfo} throws `no pk field found` and caches the error. [Reactive Data Flow](./reactive-data-flow.md#cached-failures) describes that cached failure and when it clears.

## How the Client Uses the Pk Field Name

The client never tells the server which field is the primary key. It uses the name from model info wherever it needs an object's identifier:

- The default field lists that `storeModelConfig` builds leave out the pk field.
- The built-in views pass the name as `pkKey` to the {@term CRUD Adapter} functions. The create, detail, and update views also add the pk field to the fields that they request.
- [`defaultObjectUpdate`]{@api js:function:@arrai-innovations/vueda/utils/objectCrud#defaultObjectUpdate} reads the object's pk from [`pkKey`]{@api js:param:@arrai-innovations/vueda/utils/objectCrud#defaultObjectUpdate:args.pkKey}, which defaults to `"id"`. Code that calls it directly for a model with another pk name, and omits `pkKey`, sends `undefined` as the pk segment.

## Identifier Transport

Identifiers travel in three shapes. Each uses the fixed name `pk` or `pks`, whatever the model's pk field is called.

**One object: a route parameter.** The detail route of the {@term CRUD Routes}, `/:app/:model/:action/:pk`, carries the object's pk as `params.pk`. The CRUD adapters place that value in the pk segment of the {@term Model API Path}, which [`getDetailUrl`]{@api js:function:@arrai-innovations/vueda/utils/urls#getDetailUrl} builds. A {@term Composite Primary Key} travels as its JSON array string, such as `["1","42"]`. [Set Up CRUD for a Composite Primary Key Model](../guides/composite-primary-keys.md) describes that format.

**Several objects: a query value.** When [`getCRUDForTo`]{@api js:function:@arrai-innovations/vueda/router/getCrud#getCRUDForTo} gets an array as `pk`, it targets the list route with one `pk` query value for each key, as in `?pk=4&pk=7`. An empty array targets the list route with no `pk` value. The list route that [`makeCRUDRoutes`]{@api js:function:@arrai-innovations/vueda/router/makeCrud#makeCRUDRoutes} registers passes the values to the view as an array. A list view's selection actions use this route.

Neither function splits a value, so a key that contains a comma reaches the view intact. Every composite key contains a comma, and a free-text key can. A link such as `?pk=4,7` therefore selects the single key `4,7`. The list route ignores empty `pk` values and a bare `?pk`. `getCRUDForTo` throws when its `query` argument has a `pk` entry. Code that passes another route's query to `getCRUDForTo` must remove `pk` first.

**Bulk requests: a body key.** [`defaultObjectsDelete`]{@api js:function:@arrai-innovations/vueda/utils/listCrud#defaultObjectsDelete} sends `DELETE` to the model's list path with the body `{ "pks": [...] }`. [`defaultListExecuteAction`]{@api js:function:@arrai-innovations/vueda/utils/listCrud#defaultListExecuteAction} sends the same `pks` body for a {@term Bulk Action}. The server's bulk delete, activate, and deactivate handlers read the key with [`PrimaryKeyListSerializer`]{@api py:class:vueda.core.serializers.PrimaryKeyListSerializer}. It accepts a non-empty list of integers, so those handlers answer `400` for UUID, string, or composite keys.

The lookup cache in {@api js:function:@arrai-innovations/vueda/use/useLookupContext#useLookupContext} converts each pk to a string before using it as a cache key. The number `42` and the string `"42"` then share one entry.

The ordering parameter `o` accepts `pk` as an alias for the fields behind the primary key. [Filtering and Ordering Semantics](./filtering-and-ordering-semantics.md#ordering-metadata) describes that alias.

## Choice Identifier Value Semantics

Every choice value that VUEDA sends is a string. The rule covers the inline `choices` lists in `model_fields` and `model_filtering`. It also covers the responses of the {@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/} and {@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/} endpoints. For a related model, the value is the related row's pk. For a `SlugRelatedField`, it is the value of the slug field. Integer, UUID, and other column types all arrive as JSON strings.

Filter choices omit empty values, because clearing a filter means leaving its query parameter out. Field choices keep a blank entry when the field declares one, so a form can offer it.

The server sends strings because a filter value reaches it as a query string, which has no number type. A string choice value can match that value directly. For a filter with several active values, {@api vue:component:FilterChip} finds each value's label with strict equality, so a numeric choice value would show as `unknown`. Converting on the server gives every column type one form before any client comparison.

[Choice-Backed Fields and Lookup Models](../guides/choices-and-lookups.md) gives the steps for choice-backed fields. [`ModelInfoChoicesViewSet`]{@api py:class:vueda.info.viewsets.ModelInfoChoicesViewSet} and [`ModelInfoFilterSetChoicesViewSet`]{@api py:class:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet} describe the endpoints.
