---
title: Field and Expand Semantics
type: explanation
audience: integrator
status: draft
---

# Field and Expand Semantics

{@term Sparse Fields} and {@term Expand} let a request shape its response. `f` names the fields to return, `om` names fields to drop, and `e` names relations to return inline as nested objects. The {@term Canonical Serializer} defines which fields and expands exist, {@term Model Info} publishes them, and each viewset action decides which expands a request may use.

This page describes that contract: the metadata, the per-action expand rules, how the server checks and applies each parameter on reads and writes, and what an expand costs. [Use Expand and Sparse Field Controls](../guides/expand-and-fields-controls) gives the steps for declaring expands and restricting them per action.

## Where the Contract Is Defined

The canonical serializer defines the fields and expands. A field on the Django model that the serializer does not declare is absent from this contract. A computed serializer field, such as a {@api ext:drf:rest_framework.fields.SerializerMethodField}, is part of it and can be selected in `f`.

The server builds the field and expand sections of model info from the canonical serializer on each request. The client reads them to build each view's default field lists and the details of each declared expand. A request can then choose any subset that the viewset action permits.

## Parameter Namespace and Wire Shape

The parameter names are `f`, `om`, and `e`. [Configuration Surface and Defaults](./configuration-surface-and-defaults#wire-query-parameter-namespace) lists the server settings that define them and the matching client constants, such as {@api js:property:@arrai-innovations/vueda/utils/constants#FIELDS_PARAM} and {@api js:property:@arrai-innovations/vueda/utils/constants#EXPAND_PARAM}.

A request that selects fields and expands a relation looks like this:

```text
GET /routes/myapp/widget/1/?e=owner&f=id,name,owner.id,owner.name
```

The response holds `id`, `name`, and `owner`. The `owner` value is an object with `id` and `name`. Without `e=owner`, `owner` holds the related object's primary key.

### Multi-level Field and Expand Data

A dotted name selects a field one level down: `owner.name` is the `name` field of the expanded `owner` object. The server applies these rules at each level:

- **Expanded relations stay in the response.** A relation named in `e` is returned even when `f` leaves out its name or `om` names it.
- **Sub-fields default to all.** When `f` names no sub-field of an expanded relation, the expanded object carries every field that its serializer declares.
- **Named sub-fields are the whole set.** When `f` names sub-fields, the expanded object carries only those. The server does not add the related object's primary key, so to identify the object, a request names its pk too, as `owner.id` does above.
- **Wildcards apply to one level.** `*` and `~all` select every field in `f`, or every permitted expand in `e`, at the level where they appear. `owner.*` selects every field of `owner`. `*.*` is not valid and returns a `400`.
- **`available_actions` is top-level only.** An expanded object never carries {@term Available Actions}, and `f=owner.available_actions` returns a `400`.

The server rejects any `e`, `f`, or `om` path deeper than {@api ext:drf-flex-fields2:rest_flex_fields2.config.MAXIMUM_EXPANSION_DEPTH}, which VUEDA sets to `4`. The response is a `400` with `Expansion depth exceeded` under `non_field_errors`.

## Sparse Fields and Expand on Writes

On every request method, `f` and `om` shape only the response. A `create`, `update`, or `partial_update` validates the request body against the serializer's full field set, and `f` and `om` then narrow the object that the write returns.

The request method alone decides which fields the body must contain. A `create` (`POST`) or full `update` (`PUT`) that omits a required field returns a `400` naming it, even when `f` or `om` leaves that field out of the response. A partial update (`PATCH`) treats an omitted field as optional, and validates each field that the body does supply.

`e` also changes how the body is read. A relation named in `e` accepts a nested object, and a relation left out of `e` accepts a primary key. [Nested Write Compatibility](./nested-write-compatibility) describes the nested body and how the serializer handles it.

A write checks `f` and `e` names with the same rules and messages as a read, as [Validation of `f` and `e`](#validation-of-f-and-e) describes. The check runs before the body is validated, so a `400` for an invalid name means that the write saved nothing. The valid names come from the serializer that renders the write's response.

## Field Metadata Contract

The `model_fields` section of the {@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/} response holds one entry per canonical serializer field. {@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_fields} builds it. Each entry carries metadata such as `read_only`, `required`, `many`, type descriptors, constraints like `max_length`, and static choices. [Server-Client Metadata Contract](./server-client-metadata-contract#metadata-sections) describes the sections and their keys.

The field whose name matches the model's primary key carries the {@term Pk Marker}. [Primary Key and Identifier Discipline](./pk-and-identifier-discipline) describes how the server sets it and how the client uses it.

## Expand Descriptor Contract

The `model_expands` section is a list with one descriptor per entry in the serializer's `Meta.expandable_fields`. {@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_expands} builds it. Every descriptor carries these keys:

- `name`: the relation name that a request puts in `e`.
- `many`: whether the relation returns a list of objects.
- `read_only`: whether the expanded relation is read-only. It is always `true` for a {@api py:class:vueda.core.serializers.GenericForeignKeySerializer} expand.

A descriptor carries three more keys when the expand's serializer has a `Meta.model`:

- `app_label` and `model`: the related model's identity.
- `f`: field metadata for the expanded serializer, in the same shape as `model_fields`.

A generic foreign key expand has none of the three, and neither does any other expand whose serializer declares no `Meta.model`.

When the `expandable_fields` entry passes static `f` options, the descriptor's `f` lists only those fields, plus the related model's primary key.

The canonical serializer produces descriptors only when it inherits {@api py:class:vueda.core.serializers.VuedaExpandableFieldsSerializerMixin}. {@api py:class:vueda.core.serializers.VuedaSerializer} includes it. A {@api ext:drf:rest_framework.serializers.ModelSerializer} registered without the mixin reports an empty `model_expands`, whatever its `Meta.expandable_fields` declares.

### Expands on the client

The client stores the section as {@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#ModelInfo.expand}, a list of {@api js:interface:@arrai-innovations/vueda/stores/storeModelInfo#ExpandInfo} objects. [Server-Client Metadata Contract](./server-client-metadata-contract#client-normalization) describes how the client renames and camelCases the keys.

A view's default {@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.expand} is empty, so a view requests an expand only when its model config names one. The client still keeps every descriptor in `expandDetails`. The list and detail views send the configured `expand` as `e`. The create and update views send each configured expand whose form value is set. The default field lists name no sub-fields, so each expanded object arrives with all of its fields.

For each name in a view's `expand`, the client copies the descriptor's `f` entries into {@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.fieldDetails} under dotted keys, such as `owner.name`. The server uses the same names in `f`, so a per-field override for an expanded sub-field uses that key. A view whose `expand` is empty gets no dotted keys. Building the config checks each view's `expand` and dotted field list entries, and throws one error that names each problem:

- An `expand` entry must start with an expand that model info declares.
- A field list entry under a declared expand, such as `owner.name`, needs `owner` in the same view's `expand`.
- Any other dotted entry must start with a model field, `related`, or `calculated`.

## Generic Foreign Key Expands

A {@api ext:django:django.contrib.contenttypes.fields.GenericForeignKey} can point at any model, so its expand uses `GenericForeignKeySerializer`. At representation time, the serializer looks up the related object's registered serializer with {@api py:function:vueda.info.registration.get_serializer_for_model} and renders the object with it. The output always adds `app_label`, `model`, and `formatted_name`. When the related object's model has no {@term Canonical Registration}, the expand returns `null`.

The descriptor for this expand has `type_db: null`, `type_model: "GenericForeignKey"`, and `type_serializer: "GenericForeignKeySerializer"`. It has no `f`, because the related model is known only per object. For the same reason, the server does not check `f` names under a generic foreign key expand. The expand declaration can also target field options at one related model; [Use Expand and Sparse Field Controls](../guides/expand-and-fields-controls) describes that syntax.

## Action-Scoped Expands

An {@term Action-Scoped Expand} list, set on the viewset as `permit_<action>_expands`, names the expands that a request to that action may use. {@api py:class:vueda.core.viewsets.FlexFieldsMixin} puts the list in the serializer context.

The default differs by action:

- **`list` permits no expands** until the viewset sets `permit_list_expands`. drf-flex-fields2 defaults it to `[]`. Any `e` on such a list, including `e=*`, returns a `400` with `Invalid expands. No expands are permitted.`
- **Every other action permits every declared expand** unless the viewset sets `permit_<action>_expands`, such as `permit_retrieve_expands`.

A permit list names each allowed path as the request writes it. `"customer"` permits `e=customer`, and `"customer.user"` permits `e=customer.user`. A path that the list does not name returns a `400`. A wildcard in `e` expands every name that the list holds.

Model info does not report which expands each action permits. A list view whose `expand` names a relation therefore needs the same name in `permit_list_expands`, or its request returns a `400`.

## Validation of `f` and `e`

On `list`, `retrieve`, `create`, `update`, and `partial_update`, [`validate_flex_expand_and_field_param`]{@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.validate_flex_expand_and_field_param} checks each `f` and `e` name against the action's serializer and the action's permit list. This is part of {@term Query Parameter Validation}. [Filtering and Ordering Semantics](./filtering-and-ordering-semantics.md#query-namespace-and-validation-boundary) describes how the server rejects unknown query parameter keys.

- An unknown `f` name returns a `400` keyed by that name. The message starts with `Invalid field.` and lists the valid fields and wildcards.
- An unknown or unpermitted `e` name returns a `400` keyed by that name. The message starts with `Invalid expands.`, then lists the permitted expands or says `No expands are permitted.`
- `f=pk` returns a `400`, because `pk` is not a serializer field name.
- The server does not check `om` values.

A request with any invalid name fails as a whole, and one response reports every invalid `f` and `e` name. Each name maps to a list of message strings, so a name that is invalid in both parameters carries both messages. This is the standard validation shape that [Error and Validation Contract](./error-and-validation-contract) describes. On the client, a read error raises a {@api js:class:@arrai-innovations/vueda/utils/errors#FetchError}, and a save error raises a {@api js:class:@arrai-innovations/vueda/utils/errors#FormValidationError}.

## Query Cost of List and Retrieve Expansion

On `list` and `retrieve`, {@api py:function:vueda.core.viewsets.VuedaViewSet.get_queryset} adds `select_related` and `prefetch_related` for each relation that the request expands, after the permit list and depth limit apply. {@api py:function:vueda.core.viewsets.build_prefetch_plan} derives these from each field's `source`. An expanded to-one relation costs one join, and a to-many relation costs one prefetch query, whatever the row count. The join also covers the relations that the related model lists in `formatted_name_select_related`. A to-one relation whose model sets `formatted_name = None` and a `formatted_name_lookup_expression` costs one prefetch query instead of a join. A join cannot carry the `formatted_name` annotation for the related model, and the prefetch query annotates it. The prefetch query reads the related rows the way Django loads any related object, through the model's base manager, so a default manager that filters rows does not hide the related object. When the relation's `source` crosses other to-one relations first, those relations still load through a join.

A viewset can prefetch a relation itself, in its `queryset` or `get_queryset`. When a request expands that relation, a viewset's own `Prefetch` with a queryset loads it, with any annotations that its queryset adds. A plain lookup such as `prefetch_related("customer")` has no queryset, so the expand's own prefetch loads the relation instead, with the `formatted_name` annotation.

The expands nested under a relation keep their plan whichever `Prefetch` loads that relation, for a to-one and a to-many relation alike. That `Prefetch` can be the expand's own, one that the viewset's queryset lists in `prefetch_related`, or the one from a second expandable field with the same `source`. For example, a viewset that declares `Prefetch("cart_items", queryset=CartItem.objects.all())` still serves `?e=cart_items,cart_items.product_option` at a fixed query count: `product_option` loads in one extra query after the viewset's `Prefetch`, whatever the number of items. This holds at every depth, including a viewset `Prefetch` under another prefetched relation, such as `Prefetch("cart_set__cart_items", ...)`.

A prefetch that the viewset places inside the queryset of its own `Prefetch` behaves differently. For example, with `Prefetch("cart_set", queryset=Cart.objects.prefetch_related("cart_items"))`, the cart query loads `cart_items` itself while it runs. The expands nested under `cart_items` then load one query per row ([#566](https://github.com/arrai-innovations/vueda/issues/566)). To keep a fixed query count, list the nested prefetch in the viewset's own `prefetch_related` instead, such as `Prefetch("cart_set__cart_items", ...)`.

{@api py:function:vueda.core.viewsets.apply_prefetch_plan} applies the plan on every `list` and `retrieve`, including a request that expands nothing. It keeps the joins away from each relation that a `Prefetch` queryset loads. A join that passes through such a relation is split there:

- When the expand's own `Prefetch` loads the relation, the rest of the join moves onto that `Prefetch` queryset and costs no query.
- When the viewset's own `Prefetch` loads the relation, the relations after that point load after the viewset's `Prefetch`, at one query per relation for each request.
- A plain lookup loads the same objects that a join loads, so a join through it stays.

The same split applies to the joins inside each `Prefetch` queryset that loads a relation, to-one or to-many, at every depth. A join inside that queryset is split at each relation that a nested expand, or the viewset's own `Prefetch`, prefetches. For example, `Cart.objects` joins `customer__user` for Cart's `formatted_name_select_related`. A viewset `Prefetch("cart", queryset=Cart.objects.all())` on a CartItem viewset is rebuilt without that join when a request expands `cart.customer`. The expand's own prefetch then loads each cart's `customer` with its `formatted_name` annotation, and the `user` join moves onto that prefetch. A viewset `Prefetch("cart_set", queryset=Cart.objects.all())` on a Customer viewset is rebuilt the same way for `cart_set.customer`. Django sets each cart that `cart_set` loads to point back at the customer that it was loaded for. That pointer is the cart's back reference. Because of it, the customers come from the Customer query, which already carries the annotation. The `user` join moves onto the Customer query, so each cart's `get_formatted_name()` reads a loaded user. When an expand's own `Prefetch` loads the customers instead, such as for `customer.cart_set.customer` on a CustomerOrder viewset, the join moves onto that `Prefetch` queryset. When a viewset's own `Prefetch` loads them, `user` loads after it, at one query for each request. If that `Prefetch` queryset also prefetches `cart_set` itself, the carts load while it runs, and `user` joins onto it instead. The rebuilt `Prefetch` keeps the filters, annotations, and ordering of the viewset's queryset. Only the joins that pass through a prefetched relation change.

A bare `select_related()` with no paths cannot be split. When the request expands a relation that loads through a join, the expand's joins replace the bare `select_related()`. Otherwise the bare `select_related()` stays, and its joins can replace a prefetched to-one relation. A join that a back reference moves never replaces a bare `select_related()`, on the viewset's queryset or on a `Prefetch` queryset. That join loads through a separate prefetch instead, which costs no query when the bare `select_related()` already joined the relation. Avoid a bare `select_related()` on a queryset that also prefetches a to-one relation. This also applies to a viewset's own `Prefetch` queryset.

`f` and `om` do not change the plan, because they cannot remove an expanded relation. A generic foreign key expand is not planned; each related object loads when it is rendered. The payload still grows with the row count and the expansion depth, and a short `permit_list_expands` is what limits it on a `list`.
