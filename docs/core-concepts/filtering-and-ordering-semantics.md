---
title: Filtering and Ordering Semantics
type: explanation
audience: integrator
status: draft
---

# Filtering and Ordering Semantics

Filtering and ordering pass through four places. The {@term Canonical Viewset} declares the filters and ordering fields. {@term Model Info} publishes those declarations. `list` and `retrieve` endpoints reject query parameters outside them. The client builds its filter and sort controls from the published metadata.

This page describes what the server accepts, rejects, and publishes at each step, and how the client uses it. [Configuration Surface and Defaults](./configuration-surface-and-defaults#wire-query-parameter-namespace) lists the {@term Wire Query Parameters}, and [Declare List Ordering](../guides/declare-list-ordering.md) gives the steps for setting up a list's ordering.

## Contract Boundary and Authority

Model info reads `filterset_class`, `ordering`, and `ordering_fields` from the canonical viewset. A model registered with a serializer only ({@term Serializer-Only Registration}) has an empty `model_filtering` section, because it has no filterset. Its `model_ordering` section still reports the model's own [`Meta.ordering`]{@api ext:django:django.db.models.Options.ordering}.

A serializer field is filterable only when the viewset's filterset declares a filter for it. Sorting follows [DRF: `OrderingFilter`]{@api ext:drf:rest_framework.filters.OrderingFilter}. When the viewset declares no `ordering_fields`, every readable serializer field is sortable under its `source`. A field renamed with `source="name"` sorts as `name`. A field sourced from a Python model property is not sortable, because the database has no column for it. When the viewset declares `ordering_fields`, only the fields that it names, plus the default ordering's fields, are sortable.

## Metadata Projection for Ordering and Filtering

### Ordering metadata

[`model_ordering`]{@api rest:schema:ModelInfoOrdering} has two keys:

- `default` lists the field names that the rows are sorted by when a request sends no `o`. It comes from the viewset's `ordering` when that is declared, and from the model's `Meta.ordering` otherwise. The two are never merged.
- `fields` lists every field that a request may name in `o`, each with a `name` and a semantic `type`. A field that the default ordering names also carries `ascending`.

`fields` follows the viewset's `ordering_fields`. An explicit list reports its entries, and `"__all__"` reports the model's fields and the annotations that `get_queryset` adds. With no `ordering_fields`, `fields` reports the serializer's readable fields by `source`. Every field that the default ordering reads also appears in `fields`. [`VuedaOrderingFilter`]{@api py:class:vueda.core.filters.VuedaOrderingFilter} accepts an explicit `o` for each of them.

Every name in `model_ordering` is the [public name]{@term Public Name} that a client sends back in `o`. Django's `"pk"` alias is reported as the field behind it: `id`, or each field of a {@term Composite Primary Key}. The ordering backend accepts both `o=id` and `o=pk`.

[`get_model_ordering`]{@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_ordering} documents each rule in full. {@api py:module:vueda.core.ordering} documents how an ordering term is read.

A default ordering is reported whole or not at all. `default` is empty when any of its terms cannot be reported under one field name. Three kinds of term cause that:

- A term that resolves to no field, such as a field renamed without updating `ordering`. Every `list` request that falls back to it fails with Django's `FieldError`.
- A term that reads more than one column, or none, such as `Concat("first_name", "last_name")` or `"?"`. The rows are sorted, and nothing describes the sort.
- A term that names a queryset annotation. The rows are sorted, and nothing describes the sort.

A viewset `ordering` that fails to resolve does not fall back to the model's `Meta.ordering`. DRF passes the viewset's `ordering` to [`order_by()`]{@api ext:django:django.db.models.query.QuerySet.order_by} as written, so the request fails.

The `vueda_info.E006` system check reports a viewset `ordering` or `ordering_fields` entry that names no field. Django's `models.E015` reports the same drift in `Meta.ordering`. E006 builds the viewset's queryset to learn its annotations. When `get_queryset` raises without a request, for example because it reads `self.request`, E006 skips that viewset.

An `ordering_fields` entry that names no field is left out of `fields`, and the other entries stay. The ordering backend still accepts `o` for that entry, because it validates against the declared names. A request that names it fails in `order_by()` with a server error.

### Queryset Annotations

An annotation that the viewset's `get_queryset` adds is orderable. It appears in `fields` when `ordering_fields` names it or is `"__all__"`. Its `type` comes from the annotation's `output_field`. The `type` is `alpha` when Django cannot resolve one.

A default ordering that names an annotation is not reported. `default` is empty for it, and E006 accepts it, so no check warns you. The rows are sorted and `o` on the annotation is accepted. A client cannot show which column sorts the list.

A default ordering is reported when it sorts by a real column. That column can be a model field, a {@api ext:django:django.db.models.GeneratedField}, or a column of a database view. [Declare List Ordering](../guides/declare-list-ordering.md#make-a-function-or-annotation-default-visible) shows each option.

### Database Functions in a Default Ordering

A default ordering term can be any expression that `order_by()` accepts. That includes scalar functions such as {@api ext:django:django.db.models.functions.Lower} and {@api ext:django:django.db.models.functions.Coalesce}. VUEDA reads the columns that a term uses from Django's expression tree, so any {@api ext:django:django.db.models.Func} subclass works. Window functions need a {@api ext:django:django.db.models.expressions.Window}, as Django requires.

A term that reads one column is reported under that column. Its `type` describes the column, and `ascending` follows the term's direction. `Lower("name").desc()` is reported as `name`, type `alpha`, with `ascending: false`.

A term that reads more than one column leaves `default` empty. Each column still appears in `fields` without `ascending`, so a client can offer each as a sort. A term that reads no column, such as `"?"` or {@api ext:django:django.db.models.functions.Now}, leaves `default` empty. It adds nothing to `fields`. A viewset can list `"?"` in `ordering_fields` to accept `o=?`, and `fields` does not report it.

An explicit `o` sorts by the column itself. `o=name` against a `Lower("name")` default is a case-sensitive sort. The VUEDA client does not send the default ordering back, so a list that the reader has not sorted keeps the function.

### `formatted_name` as an ordering and filter target

A model's {@term Formatted Name} is orderable when the database can sort it: a `formatted_name` column, or a path named by `formatted_name_lookup_expression`. Metadata reports either as `formatted_name`, typed from the column that the path reaches. [Create a CRUD Surface](../guides/create-crud-surface#the-formatted-name-contract) describes how a model configures its formatted name.

A `formatted_name` computed by `get_formatted_name()` has no column. It is left out of `fields`, and a default ordering that names it is not reported. The `vueda_info.E005` system check reports ordering declared on a computed `formatted_name`.

A model's `Meta.ordering` may name its own lookup-expression `formatted_name` when its default manager is a {@api py:class:vueda.core.models.FormattedNameManager}. Django's `models.E015` skips that one term. A related path such as `customer__formatted_name` in `Meta.ordering` still fails `models.E015`.

A viewset's ordering and filters can name a related model's `formatted_name` at any depth, such as `customer__formatted_name`. A client sends the dotted form, `o=customer.formatted_name`. On the server, `VuedaOrderingFilter` and the filterset rewrite the path to the column behind it, such as `customer__data__formatted_name`. Metadata and the accepted query names use the declared path. A request that names the rewritten path is rejected.

Two related shapes are left unrewritten, as {@api py:function:vueda.core.formatted_name.resolve_formatted_name_path} describes. One is a related `formatted_name` computed by `get_formatted_name()`. The other is a path through a reverse foreign key or many-to-many, which would multiply rows. In ordering, E006 reports both, and metadata leaves them out.

A related `formatted_name` that is a real column is an ordinary field path. Through a many-valued relation it is neither rewritten nor reported, and it multiplies rows like any other such path.

### The Filterset Half of the Rewrite

A filter builds its query from its `field_name`, so the rewrite happens on the filterset. {@api py:class:vueda.core.filters.FormattedNamePathFilterSetMixin} rewrites `field_name` on each filterset instance's copy of its filters. The class declaration keeps the declared path, and the generated filter label comes from it.

Both VUEDA filterset bases include the mixin: {@api py:class:vueda.core.filters.VuedaFilterSet} and {@api py:class:vueda.core.filters.VuedaCompositePrimaryKeyFilterSet}. A filterset built on [django-filter: `FilterSet`]{@api ext:django-filter:django_filters.filterset.FilterSet} directly gets no rewrite. A filter on `customer__formatted_name` there raises `FieldError`, a server error, on each request that sends it. [Declare List Ordering](../guides/declare-list-ordering.md#order-and-filter-by-a-related-formatted-name) shows how to add the mixin.

No system check reads a filter's `field_name`. A filter on one of the two unrewritten shapes stays in `model_filtering`, and a request that sends it raises `FieldError`.

`VuedaCompositePrimaryKeyFilterSet` declares no default filters, because a composite primary key model has no `id` field. [Set Up CRUD for a Composite Primary Key Model](../guides/composite-primary-keys.md) covers its filters.

### Filtering metadata

[`model_filtering`]{@api rest:schema:ModelInfoFilter} maps each filter's public name to an entry. Every entry carries `hidden`, `label`, `lookup_exprs`, `required`, `type_db`, `type_model`, `type_filter`, `choices`, and `input_type`. Optional keys, such as `suffixes`, appear when they apply.

`lookup_exprs` is a list with one element. A django-filter filter has one lookup expression. A `Meta.fields` entry with several lookups becomes one filter per lookup.

A filter whose form field is disabled is left out. A negated filter (`exclude=True`) is reported like any other filter.

`choices` takes one of three forms:

- A list of `{label, value}` entries for a static choice set. Values are strings, and the blank placeholder option is left out.
- `true`, with `app_label`, `model`, and `filterset_name`, for a filter backed by a related model's queryset. The client loads these choices from the filter-choices endpoint.
- `true`, with the same keys, for a value-derived filter such as [django-filter: `AllValuesFilter`]{@api ext:django-filter:django_filters.filters.AllValuesFilter}. Its options are the values that the column holds now, so it is reported this way even when the column is empty.

### Public Filter Names

{@api py:class:vueda.core.filters.PublicFilterAliasMixin} renames every filter to a public name by turning each `__` into `.`. Both VUEDA filterset bases include it. A `Meta.fields` entry of `{"customer__formatted_name": ["exact", "icontains"]}` produces `customer.formatted_name` and `customer.formatted_name.icontains`. A filter declared under an attribute name with no `__`, such as `customer_name`, keeps that name.

Only the public name is accepted. A request that sends the declared name, such as `customer__formatted_name=`, gets a `400`.

A dotted public name does not say whether its last segment is a lookup or a relation. `customer.formatted_name.icontains` is the `icontains` lookup on `customer.formatted_name`. Clients read the exact names from `model_filtering`.

A multi-widget filter adds its suffix after an underscore. [django-filter: `RangeFilter`]{@api ext:django-filter:django_filters.filters.RangeFilter} declared as `distributor__id` accepts `distributor.id_min` and `distributor.id_max`. The client finds the suffix by splitting the key on the last underscore, which works because paths use `.`.

The `vueda_info.E012` system check reports two filters that accept the same query parameter. Both filters below accept `distributor.id_min`:

```python
class ProductFilterSet(VuedaFilterSet):
    distributor__id = filters.RangeFilter(field_name="distributor__id")
    distributor__id_min = filters.NumberFilter(field_name="distributor__id", lookup_expr="gte")
```

The check's hint says to rename or remove one of them. It also covers names generated from `Meta.fields`.

## Queryset Ordering

An `order_by()` on the viewset's `queryset` attribute, or inside `get_queryset`, sorts rows that no declaration describes. `OrderingFilter` applies only the viewset's `ordering` or the request's `o`. With neither, it leaves the queryset's order in place. The rows arrive in the queryset's order, while `default` reports the model's `Meta.ordering` or nothing.

When the viewset declares `ordering`, that ordering replaces the queryset's own on every `list` request. The metadata is then accurate, and the queryset's `order_by()` has no effect.

A model's `Meta.ordering` is applied by Django, and the ordering backend applies nothing when the viewset declares no `ordering`. This matters for nulls placement, described in the next section.

The `vueda_info.E010` system check compares the terms on the `queryset` class attribute with the default ordering that metadata reports. It sends a different message for each case: a viewset `ordering` that disagrees, a `Meta.ordering` that disagrees, and no default at all. The check does not see these cases:

- An ordering applied inside `get_queryset`, in a manager, or in a helper. The check never calls `get_queryset`.
- An ordering that varies by request.
- A viewset whose `filter_backends` leaves out the ordering backend. The queryset's order then always wins.
- A bare `order_by()`, which clears the model's default ordering. [`queryset_explicit_ordering`]{@api py:function:vueda.core.ordering.queryset_explicit_ordering} describes this gap.

The check shows only that a viewset's class-level declarations agree. It does not show the order that any request returns.

## Nulls Placement for Client-Requested Ordering

Stock DRF passes an explicit `o` to the database as a plain field name. The database's default nulls placement then applies, even when the default ordering placed nulls first.

[`nulls_ordering`]{@api py:property:vueda.core.viewsets.VuedaViewSet.nulls_ordering} maps a field to `"first"` or `"last"`. `VuedaOrderingFilter` applies that placement in both directions. A field also listed in [`nulls_ordering_flip`]{@api py:property:vueda.core.viewsets.VuedaViewSet.nulls_ordering_flip} swaps the placement when sorted descending.

The placement applies wherever the field is sorted by name: an explicit `o`, and a viewset `ordering` written as strings. A term written as an expression, such as `F("due_date").asc(nulls_first=True)`, keeps its own placement. A model's `Meta.ordering` gets no placement when the viewset declares no `ordering`, because the backend applies nothing then.

Keys are `__`-joined paths, as in `ordering`. A dotted key, or a key that names no orderable field, applies nothing, and no check reports it ([#312](https://github.com/arrai-innovations/vueda/issues/312)).

A value other than `"first"` or `"last"` is ignored at request time, and the rows use the database's default placement. The `vueda_info.E007` system check reports such a value. It also reports a `nulls_ordering` that is not a dict, and a `nulls_ordering_flip` entry that has no placement to flip. It reports every problem in both attributes in one run.

`model_ordering` does not report nulls placement.

## Query Namespace and Validation Boundary

{@api py:class:vueda.core.viewsets.NoExtraFieldsForViewSetMixin} rejects any query parameter that the endpoint does not recognize. This is {@term Query Parameter Validation}.

A `list` request accepts:

- Each filter's public name, and for a multi-widget filter, each suffixed name such as `distributor.id_min`.
- `p`, `ps`, `e`, `f`, `om`, `s`, and `o`.
- `ct`, the column totals parameter, when the viewset includes {@api py:class:vueda.core.viewsets.ListRowLevelViewSetMixin}.

A viewset with no `filterset_class` accepts only the second and third groups. A `retrieve` request accepts only `e`, `f`, and `om`.

An unrecognized key gets a `400` with one entry per unknown key. The message starts with `Invalid query parameter.` and then names the accepted filters. When the viewset has no filterset, it names the accepted parameters. The client's list adapters classify this response as a {@api js:class:@arrai-innovations/vueda/utils/errors#ListFilterError}, as [CRUD Adapter Layer](./crud-adapter-layer.md) describes. [Field and Expand Semantics](./field-and-expand-semantics.md) describes how `f` and `e` values are checked.

DRF ignores unknown query parameters by default. [DRF Ecosystem Compatibility Boundaries](./drf-ecosystem-deviations) describes this departure.

[`remove_invalid_fields`]{@api py:function:vueda.core.filters.VuedaOrderingFilter.remove_invalid_fields} checks every comma-separated `o` term before applying any. If one term is invalid, the request gets a `400` keyed `o`. The message names every invalid term and lists the valid ones. Empty terms, as in `o=name,`, are dropped.

A term is valid when it is the public name of a field in [`get_valid_fields`]{@api py:function:vueda.core.filters.VuedaOrderingFilter.get_valid_fields}. That set holds every declared `ordering_fields` name, each field that the default ordering reads, and the fields behind `"pk"`.

## Search Contract Surface

{@api py:class:vueda.core.filters.VuedaSearchFilterBackend} handles `s`. It extends [DRF: `SearchFilter`]{@api ext:drf:rest_framework.filters.SearchFilter} with three `search_fields` prefixes:

- `#` for trigram similarity.
- `~` for trigram word similarity.
- `V:` for ranked search.

DRF's own prefixes, `^`, `=`, `@`, and `$`, still work. With no `#`, `~`, or `V:` field, the backend behaves as `SearchFilter`. The exception is a field that reaches through a many-valued relation, which [Search Through a Many-Valued Relation](#search-through-a-many-valued-relation) describes.

Plain, `#`, and `~` fields filter rows, and each group must match. `#` and `~` fields join the search terms into one term. `V:` fields rank the rows that remain and filter nothing.

A search is ranked when it has a `V:` field, or a plain field alongside `#` or `~` fields. The rank, `combined_rank`, adds full-text rank, trigram similarity, a whole-word match score, and 10 per plain match. Rows below [`search_threshold`]{@api py:property:vueda.core.filters.VuedaSearchFilterBackend.search_threshold} (0.2) are dropped. A search that uses only `#` or `~` fields is filtered and not ranked.

A ranked search is sorted by `combined_rank`, best first, unless the request sends `o`. Any nonempty `o` replaces the rank order. An `o` with an invalid term gets the `400` described above.

### Search Through a Many-Valued Relation

A search field can reach through a reverse foreign key or a many-to-many, such as `V:cart_items__product_option__name` on a `Cart`. A join on that relation returns one row per matching related row. The backend keeps those joins inside an `Exists` subquery and narrows the viewset's queryset to the objects that match. The list returns each object once, whatever the prefix.

In a ranked search, an object matches when at least one of its related rows reaches `search_threshold`. The object ranks by its best matching row, and the primary key breaks ties. When the request sends `o`, the list keeps the order that it has without a search, and the primary key breaks ties.

The subquery reads the viewset's search queryset, which [`get_search_queryset`]{@api py:function:vueda.core.filters.VuedaSearchFilterBackend.get_search_queryset} returns. It is the result of the viewset's own `get_search_queryset()` when the viewset defines one. Otherwise, it is the model's default manager.

The viewset's queryset applies its ordering, annotations, aggregates, and filters outside the subquery, so they see every related row. A viewset that lists only carts with at least three items keeps such a cart when two of its items match the search:

```python
class CartViewSet(VuedaViewSet):
    search_fields = ["V:cart_items__product_option__name"]

    def get_queryset(self):
        return super().get_queryset().annotate(item_count=Count("cart_items")).filter(item_count__gte=3)
```

A filter through the searched relation and the search are separate conditions, as two `filter()` calls on a many-valued relation are in Django. Take a viewset queryset filtered by `cart_items__quantity__gte=24`. It keeps a cart with one item of quantity 24 and another item that matches the search.

A search whose fields follow only foreign keys joins at most one row per object. So does a search whose fields are all annotations of the viewset's queryset. Such a search matches against the viewset's queryset directly and never reads the search queryset.

#### When a Viewset Needs `get_search_queryset()`

A viewset defines `get_search_queryset()` in two cases. In the first, its `search_fields` name an annotation that only its `get_queryset()` adds, alongside a field through a many-valued relation. The default manager lacks the annotation, so every search request fails with `FieldError: Cannot resolve keyword 'customer_name'`, a server error:

```python
class CartViewSet(VuedaViewSet):
    search_fields = ["V:customer_name", "V:cart_items__product_option__name"]

    def get_queryset(self):
        return super().get_queryset().annotate(customer_name=F("customer__user__name"))

    def get_search_queryset(self):
        return Cart.objects.annotate(customer_name=F("customer__user__name"))
```

An annotation that the default manager already adds needs no `get_search_queryset()`. One example is the `formatted_name` that a {@api py:class:vueda.core.models.FormattedNameManager} adds.

In the second case, the model's default manager hides rows that the viewset lists. In this example, the default manager leaves out archived widgets, and the viewset lists them through a second manager:

```python
class WidgetManager(FormattedNameManager):
    def get_queryset(self):
        return super().get_queryset().filter(archived=False)


class Widget(VuedaModel):
    objects = WidgetManager()
    all_objects = FormattedNameManager()


class WidgetViewSet(VuedaViewSet):
    queryset = Widget.all_objects.all()
    search_fields = ["V:parts__name"]

    def get_search_queryset(self):
        return Widget.all_objects.all()
```

Without `get_search_queryset()`, the subquery reads `Widget.objects`, so every search leaves out the archived widgets. The request returns a `200`, and no system check reports it.

A search queryset follows four rules:

- It carries every annotation that `search_fields` name.
- It includes every row that the viewset lists.
- It applies no filters. Inside the subquery, a filter on an aggregate or a window function sees only the matching related rows. A filter through the searched relation limits a ranked search to the related rows that pass it.
- It is a new queryset. Returning `self.get_queryset()` brings the viewset's filters into the subquery.

The `vueda_info.E014` system check reads the search queryset of each registered viewset whose search reaches through a many-valued relation. It reports a `search_fields` entry that names neither a model field nor an annotation of the search queryset. It also reports a `get_search_queryset()` that filters on an aggregate or a window function. It skips a `get_search_queryset()` that cannot run outside a request, for example because it reads `self.request`.

## Filter Choices and Permission Surfaces

Choices for a queryset-backed or value-derived filter change with the data, so model info does not include them. The client loads them from {@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}. It requests a page size of 200 and loads only the first page ([#381](https://github.com/arrai-innovations/vueda/issues/381)). [`ModelInfoFilterSetChoicesViewSet`]{@api py:class:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet} describes that endpoint.

The endpoint returns:

- `404` for a filter name that the filterset does not declare. The message lists the valid names.
- `404` for a model with no viewset, or a viewset with no filterset.
- `403` when the user lacks the mapped `read` permission on the model. A queryset-backed filter also needs the mapped `list` permission on the related model. Without it, the list works and that filter's dropdown stays empty.
- `500` with `FieldError` when the related model has no label path. That model has no `formatted_name` column, no `formatted_name_lookup_expression`, and no `get_formatted_name()`.

The `500` case gets no startup report for a model outside `FormattedNameBaseModel`, such as the user model. The `vueda_info.E001` system check covers only a `FormattedNameBaseModel` that sets `formatted_name = None` with neither alternative.

Choices come only from rows that the user may list. [`filter_rows_for_user`]{@api py:function:vueda.core.permissions.filter_rows_for_user} narrows the model's rows by the same row-level and workflow state rules that the `list` view applies. The request's other filters then narrow those rows. A value-derived filter offers only the values that those rows hold. A queryset-backed filter offers only related rows that the user may also list, by the same rules on the related model. A related row that the user may not list is left out, even when a visible row references it. Static choices read no rows, so these rules do not change them.

The endpoint does not call the viewset's `get_queryset`. A dropdown can therefore offer a value that appears only on rows that `get_queryset` excludes from the list ([#459](https://github.com/arrai-innovations/vueda/issues/459)). [Row-Level Permission Filtering](./row-level-permission-filtering.md) describes the row-level rules.

## Client Normalization and Cache Semantics

{@api js:function:@arrai-innovations/vueda/stores/storeModelInfo#storeModelInfo} fetches model info once per `app.model` and camelCases its keys. {@api js:function:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig} derives from it:

- [`sortables`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.sortables}, the names in `ordering.fields`.
- [`sorted`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.sorted}, the `ordering.default` names with their `ascending` directions.
- [`filterables`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.filterables} and [`filterableDetails`]{@api js:property:@arrai-innovations/vueda/stores/storeModelConfig#ModelConfig.filterableDetails}, from `filtering`.

{@api js:function:@arrai-innovations/vueda/use/useFilterables#useFilterables} merges the config's filterables with a view's overrides. {@api js:module:@arrai-innovations/vueda/use/useViewList} resolves that list once for {@api vue:component:ViewList} and passes it to {@api vue:component:FilterGroup}. {@api js:function:@arrai-innovations/vueda/use/useFilter#useFilter} picks each filter's component and widget. {@api js:module:@arrai-innovations/vueda/use/useFilterForm} converts a filter value to and from its URL form, using the filter's one lookup expression. `useViewList` writes the reader's sort to `o`. {@api js:function:@arrai-innovations/vueda/stores/storeModelChoices#storeModelChoices} and {@api js:function:@arrai-innovations/vueda/use/useModelChoices#useModelChoices} load filter choices.

The add-filter menu, {@api vue:component:FilterMenu}, offers only filters that the client can render an input for. `useViewList`'s [`validFilterables`]{@api js:interface:@arrai-innovations/vueda/use/useViewList#ViewListFilterGroup} keeps a visible filter when its type has value handling and components to mount. The components come from the filter field mapping, or from the view config's `fieldComponents` and `widgetComponents`. A range filter needs both boundary components. A widget that resolves to {@api vue:component:WidgetUnmapped} does not count, because it shows a diagnostic. A filter that fails this check is left out of the menu, and its URL value is not restored. A console warning names the app, model, and filter once per list visit.

{@api js:function:@arrai-innovations/vueda/utils/fieldMappings#mergeFilterFieldMapping} registers a custom type's components and value handling together. [Filter Input Types](#filter-input-types) lists the built-in types.

A filter marked `hidden`, such as the `id` filter that {@api py:class:vueda.core.filters.IdInFilterSet} declares, has no input, whatever its type. Its type needs no mapping. Its URL value still reaches the `list` request and shows as a {@term List Scope}, a chip with a clear control. [Open a Scoped List](../guides/scope-a-list.md) describes scopes, the `scopes` prop, and clearing.

`storeModelInfo` caches a failed fetch. Later requests for that model reject with the cached error, so its filter and sort controls stay unavailable until the cache clears. [Reactive Data Flow](./reactive-data-flow.md) describes when that happens.

## Filter Input Types

Each `model_filtering` entry reports a `type_filter`, which the client reads as `typeFilter`. For most filters, it names the Django form field class that the filter builds. `AllValuesFilter` and [django-filter: `AllValuesMultipleFilter`]{@api ext:django-filter:django_filters.filters.AllValuesMultipleFilter} report `AllValuesChoiceField` and `AllValuesMultipleChoiceField`. Their choices are the values that a column holds, and the client loads them from the filter-choices endpoint.

The client picks a filter's input and value shape from its type. Two tables in {@api js:module:@arrai-innovations/vueda/utils/fieldMappings} describe each type:

- [`FilterFieldMappings`]{@api js:property:@arrai-innovations/vueda/utils/fieldMappings#FilterFieldMappings} holds value handling. `initialValue` is the empty value that the filter form starts from. `array` marks a list value. `repeatedKey` marks a list that the `list` request sends as one key per value. `range` marks a range.
- [`filterFieldMapping`]{@api js:property:@arrai-innovations/vueda/utils/fieldMappings#filterFieldMapping} holds the components: the field component and widget. For a range, it holds the field set and each boundary's component and widget.

### Built-in Types

| `typeFilter`                                                                   | Input                                                       | URL value                            |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------ |
| `CharField`                                                                    | `WidgetTextInput`                                           | The text                             |
| `BooleanField`                                                                 | `WidgetToggle`                                              | `true` or `false`                    |
| `NullBooleanField`                                                             | `WidgetSelectDropdown` with the metadata's choices          | The chosen value                     |
| `ChoiceField`, `TypedChoiceField`                                              | `WidgetSelectDropdown` with the metadata's choices          | The chosen value                     |
| `ModelChoiceField`                                                             | `WidgetModel`, single select                                | The chosen primary key               |
| `MultipleChoiceField`                                                          | `WidgetCombobox`, multi-select, with the metadata's choices | One value per choice                 |
| `ModelChoiceInField`, `ModelMultipleChoiceInField`, `ModelMultipleChoiceField` | `WidgetModel`, multi-select                                 | One primary key per choice           |
| `AllValuesChoiceField`                                                         | `WidgetModel`, single select                                | The chosen stored value              |
| `AllValuesMultipleChoiceField`                                                 | `WidgetModel`, multi-select                                 | One stored value per choice          |
| `DateField`                                                                    | `WidgetDateField`                                           | `YYYY-MM-DD`                         |
| `DateTimeField`, `IsoDateTimeField`                                            | `WidgetDateField` with minute granularity                   | `YYYY-MM-DDTHH:MM:SS`                |
| `TimeField`                                                                    | `WidgetTimeField`                                           | `HH:MM:SS`                           |
| `DurationField`                                                                | `WidgetDuration` with days, hours, and minutes              | `[D ]HH:MM:SS`, such as `1 02:30:00` |
| `DecimalField`, `PositiveDecimalField`, `FloatField`                           | `WidgetNumberInput`                                         | The number                           |
| `DecimalInField`                                                               | `WidgetTagsInput`, numbers only                             | One number per entry                 |
| `RangeField`                                                                   | Two `WidgetNumberInput` boundaries                          | One key per suffix                   |
| `DateRangeField`                                                               | Two `WidgetDateField` boundaries                            | One key per suffix                   |
| `DateTimeRangeField`                                                           | Two `WidgetDateField` boundaries with minute granularity    | One key per suffix                   |

In the page URL, a list value repeats its key once per value, such as `?condition=new&condition=used`. A range writes one `<filter>_<suffix>` key per boundary, with the two suffixes from its metadata.

The `list` request sends a list value in the form that the filter's Django widget reads:

- `MultipleChoiceField`, `ModelMultipleChoiceField`, and `AllValuesMultipleChoiceField` set `repeatedKey`. The request repeats the key once per value, such as `?condition=new&condition=used`. Their `SelectMultiple` widget reads each key as one value, so a stored value with a comma, such as `Acme, Inc.`, arrives intact.
- `ModelChoiceInField`, `ModelMultipleChoiceInField`, and `DecimalInField` send one comma-separated value, such as `?price.in=1,2.5`. Their django-filter CSV widget reads one key and splits its value.

`ChoiceField`, `TypedChoiceField`, and `MultipleChoiceField` filters show the choices that their metadata lists. The `ModelChoice*` and `AllValues*` types report `choices: true`. {@api vue:component:WidgetModel} loads their choices from the filter-choices endpoint when the input gets focus or already holds a value.

The add-filter menu leaves out a visible filter whose type is missing from either table, such as a `UUIDField` filter. [Client Normalization and Cache Semantics](#client-normalization-and-cache-semantics) describes that check.

### Custom Filter Types

`mergeFilterFieldMapping` registers a custom type or changes a built-in one. An entry's `initialValue`, `array`, `repeatedKey`, and `range` keys go to `FilterFieldMappings`. Its other keys go to `filterFieldMapping`.

```js
import WidgetColor from "./WidgetColor.vue";
import { mergeFilterFieldMapping } from "@vueda/utils/fieldMappings.js";

mergeFilterFieldMapping({
    ColorField: {
        component: "FormField",
        fieldProps: { hidden: true },
        widget: WidgetColor,
        initialValue: null,
    },
});
```

A type needs entries in both tables. Without value handling, the filter form cannot build an empty or URL-restored value. Without components, it has nothing to render.

- The widget's value is what the request parameter carries: a string, or an array of strings for a type with `array`.
- A list type sets `array: true` and `initialValue: []`. A single URL value then restores as a list with one entry. A list type whose Django widget reads repeated keys, such as `SelectMultiple`, also sets `repeatedKey: true`. Without it, the `list` request sends the values as one comma-separated value.
- A range type sets `range: true` and an `initialValue` object. It provides `component: "FieldSetRange"`, `boundaryComponent`, and `boundaryWidget`. The filter's metadata supplies the two suffixes.
- `fieldProps: { hidden: true }` makes `FormField` render the widget without its own label row, because the filter form already shows the filter's label. It does not hide the filter.

## Observable Failure Modes

**A field sorts under its source name.** With no `ordering_fields`, a serializer field that renames `Product.name` to `title` sorts as `name`. A request for `o=title` gets a `400`, as does `o` on a property-backed field. Both columns look sortable in the UI, and sorting one returns the `400`.

**The sort indicator disagrees with the rows.** A queryset `order_by()` sorts the rows while `default` reports another order, or none. The response is a `200`. The client's sort indicator is wrong, and its reset restores an order the server never applied.

**A sorted list shows no sort.** A default ordering on a multi-column function, a column-less term, or an annotation sorts the rows without a `default` entry. No check reports it, and the client shows no sort indicator.

**A search leaves out rows that the default manager hides.** A viewset lists rows that its model's default manager filters out, such as archived rows listed through a second manager. Every search through a many-valued relation leaves those rows out, with a `200`. No check reports it. [When a Viewset Needs `get_search_queryset()`](#when-a-viewset-needs-get-search-queryset) gives the fix.

**A search on an annotation raises `FieldError`.** A viewset's `search_fields` name an annotation that only its `get_queryset()` adds, alongside a field through a many-valued relation. Every search request fails with a server error. `vueda_info.E014` reports the viewset at startup.

**A filter dropdown stays empty.** The filter-choices endpoint answers `403` or `500` while the rest of the list works. The request that fails is the choices request, and the `list` request succeeds.
