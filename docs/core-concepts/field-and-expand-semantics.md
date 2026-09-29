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

The server builds the field and expand sections of model info from the canonical serializer on each request. The client reads them to build each view's default field lists and expands. A request can then choose any subset that the viewset action permits.

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

The server rejects any `e`, `f`, or `om` path deeper than {@api ext:drf-flex-fields:rest_flex_fields.MAXIMUM_EXPANSION_DEPTH}, which VUEDA sets to `4`. The response is a `400` with `Expansion depth exceeded` under `non_field_errors`.

## Sparse Fields and Expand on Writes

On every request method, `f` and `om` shape only the response. A `create`, `update`, or `partial_update` validates the request body against the serializer's full field set, and `f` and `om` then narrow the object that the write returns.

The request method alone decides which fields the body must contain. A `create` (`POST`) or full `update` (`PUT`) that omits a required field returns a `400` naming it, even when `f` or `om` leaves that field out of the response. A partial update (`PATCH`) treats an omitted field as optional, and validates each field that the body does supply.

`e` also changes how the body is read. A relation named in `e` accepts a nested object, and a relation left out of `e` accepts a primary key. [Nested Write Compatibility](./nested-write-compatibility) describes the nested body and how the serializer handles it.

A write does not check `f` names. `PATCH ?f=bogus` returns `200` with the body `{}` ([#395](https://github.com/arrai-innovations/vueda/issues/395)). A write does check `e` names. Before it validates the body, a `create`, `update`, or `partial_update` checks each name against the action's permitted expands with [`validate_flex_expand_param_for_write`]{@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.validate_flex_expand_param_for_write}. An unknown or unpermitted name returns a `400` keyed by that name, with the same message that a read gets.

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

A view's default {@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.expand} is every descriptor name. The list and detail views send it as `e`. The create and update views send each configured expand whose form value is set. The default field lists name no sub-fields, so each expanded object arrives with all of its fields.

For each name in a view's `expand`, the client copies the descriptor's `f` entries into {@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.fieldDetails} under dotted keys, such as `owner.name`. The server uses the same names in `f`, so a per-field override for an expanded sub-field uses that key. A view whose `expand` is empty gets no dotted keys.

## Generic Foreign Key Expands

A {@api ext:django:django.contrib.contenttypes.fields.GenericForeignKey} can point at any model, so its expand uses `GenericForeignKeySerializer`. At representation time, the serializer looks up the related object's registered serializer with {@api py:function:vueda.info.registration.get_serializer_for_model} and renders the object with it. The output always adds `app_label`, `model`, and `formatted_name`. When the related object's model has no {@term Canonical Registration}, the expand returns `null`.

The descriptor for this expand has `type_db: null`, `type_model: "GenericForeignKey"`, and `type_serializer: "GenericForeignKeySerializer"`. It has no `f`, because the related model is known only per object. For the same reason, the server does not check `f` names under a generic foreign key expand. The expand declaration can also target field options at one related model; [Use Expand and Sparse Field Controls](../guides/expand-and-fields-controls) describes that syntax.

## Action-Scoped Expands

An {@term Action-Scoped Expand} list, set on the viewset as `permit_<action>_expands`, names the expands that a request to that action may use. {@api py:class:vueda.core.viewsets.FlexFieldsMixin} puts the list in the serializer context.

The default differs by action:

- **`list` permits no expands** until the viewset sets `permit_list_expands`. drf-flex-fields defaults it to `[]`. Any `e` on such a list, including `e=*`, returns a `400` with `Invalid expands. No expands are permitted.`
- **Every other action permits every declared expand** unless the viewset sets `permit_<action>_expands`, such as `permit_retrieve_expands`.

A permit list names each allowed path as the request writes it. `"customer"` permits `e=customer`, and `"customer.user"` permits `e=customer.user`. A path that the list does not name returns a `400`. A wildcard in `e` expands every name that the list holds.

The client's default list `expand` is every declared expand, and model info does not report which expands each action permits. So on a model that declares expands and sets no `permit_list_expands`, the default list view's request returns a `400` ([#396](https://github.com/arrai-innovations/vueda/issues/396)).

## Validation of `f` and `e`

On `list` and `retrieve`, [`validate_flex_expand_and_field_param`]{@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.validate_flex_expand_and_field_param} checks each `f` and `e` name against the serializer and the action's permit list. This is part of {@term Query Parameter Validation}. [Filtering and Ordering Semantics](./filtering-and-ordering-semantics.md#query-namespace-and-validation-boundary) describes how the server rejects unknown query parameter keys.

- An unknown `f` name returns a `400` keyed by that name. The message starts with `Invalid field.` and lists the valid fields and wildcards.
- An unknown or unpermitted `e` name returns a `400` keyed by that name. The message starts with `Invalid expands.`, then lists the permitted expands or says `No expands are permitted.`
- `f=pk` returns a `400`, because `pk` is not a serializer field name.
- The server does not check `om` values.

A request with any invalid name fails as a whole, and the response carries only the errors. Each entry is an object with `message` and `code` keys. [Error and Validation Contract](./error-and-validation-contract) describes the standard validation shape, which differs from these entries ([#375](https://github.com/arrai-innovations/vueda/issues/375)). On the client, these read errors raise a {@api js:class:@arrai-innovations/vueda/utils/errors#FetchError}.

## Query Cost of List and Retrieve Expansion

On `list` and `retrieve`, {@api py:function:vueda.core.viewsets.VuedaViewSet.get_queryset} adds `select_related` and `prefetch_related` for each relation that the request expands, after the permit list and depth limit apply. {@api py:function:vueda.core.viewsets.build_prefetch_plan} derives these from each field's `source`. An expanded to-one relation costs one join, and a to-many relation costs one prefetch query, whatever the row count.

`f` and `om` do not change the plan, because they cannot remove an expanded relation. A generic foreign key expand is not planned; each related object loads when it is rendered. The payload still grows with the row count and the expansion depth, and a short `permit_list_expands` is what limits it on a `list`.
