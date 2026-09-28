---
title: Expose Aggregates in `list` Responses
type: how-to
audience: integrator
status: draft
---

# Expose Aggregates in `list` Responses

This guide adds {@term Column Totals} to a model's `list` endpoint and shows them in the footer row of `ViewList`'s table. You declare the totals on the viewset. The client discovers them from {@term Model Info} and requests the ones its visible columns can show.

## Before You Begin

- The viewset includes {@api py:class:vueda.core.viewsets.ListRowLevelViewSetMixin}. {@api py:class:vueda.core.viewsets.VuedaViewSet} and {@api py:class:vueda.core.viewsets.VuedaReadOnlyViewSet} both include it.
- The `list` endpoint paginates with {@api py:class:vueda.core.pagination.VUEDAPageNumberPagination}, or a subclass that keeps its `get_paginated_response`. That method adds the `columnTotals` key, and another pagination class drops the totals. A viewset with `pagination_class = None` returns a bare array and computes no totals.
- The viewset is served at its {@term Model API Path}. The examples use an `Invoice` model in a `billing` app, served at `/routes/billing/invoice/`.

## Declare the Totals

Set [`column_totals`]{@api py:property:vueda.core.viewsets.ListRowLevelViewSetMixin.column_totals} to a mapping of total name to the ORM path it sums:

```python
class InvoiceViewSet(VuedaViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    column_totals = {
        "subtotal": "subtotal",
        "tax": "tax",
        "product_price": "product_option__price",
    }
```

Name each total after the display column that renders it. The name is what a client requests and the key the total comes back under; the path stays on the server. A serializer field `price` with `source="product_option.price"` renders in a column named `price`, so its total is `{"price": "product_option__price"}`.

Each path must follow two rules:

- It ends on a column the database can `SUM`: a numeric field or a `DurationField`.
- It reaches only through forward foreign keys and one-to-one relations. A reverse foreign key, a many-to-many, or a `GenericRelation` adds a row per related object, which inflates every total in the same query.

The `ListRowLevelViewSetMixin` reference explains both rules. A total is a plain `SUM` of the stored values, so it adds values in different units or currencies as they are. [#336](https://github.com/arrai-innovations/vueda/issues/336) tracks refusing mixed-currency aggregates.

### Total a Queryset Annotation

A path can also name an annotation that the viewset's own `get_queryset` adds:

```python
class InvoiceLineViewSet(VuedaViewSet):
    queryset = InvoiceLine.objects.all()
    serializer_class = InvoiceLineSerializer
    column_totals = {"line_total": "line_total"}

    def get_queryset(self):
        return super().get_queryset().annotate(line_total=F("quantity") * F("unit_price"))
```

The system check accepts the name without applying the two path rules, so the annotation must have one value per row. An annotation that reads the multi-valued side of a join has a value per related row, and its total is wrong. [`get_column_info`]{@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.get_column_info} describes how each kind of total counts a matched row once.

When the value could be a column, store it in a {@api ext:django:django.db.models.GeneratedField} or a database view instead, so the check validates the path. [Declare List Ordering](./declare-list-ordering.md#make-a-function-or-annotation-default-visible) shows both, and [Queryset Annotations](../core-concepts/filtering-and-ordering-semantics.md#queryset-annotations) gives the same advice for ordering.

## Run the System Check

Run `python manage.py check`. The `vueda_info.E013` error names the viewset, the total, and the problem. It reports:

- a `column_totals` that is not a mapping;
- a name that is empty, contains a comma, is a wildcard value (`*` or `~all`), or is one Django refuses as a column alias;
- a path that names no model field and no annotation of the viewset's queryset;
- a path through a relation that can match more than one row;
- a path that ends on a relation, or on a column `SUM` cannot add.

When `get_queryset` reads `self.request`, the check cannot build the queryset. It then checks the names only and skips the path rules.

The `vueda_info.W002` warning reports a name that contains a percent sign. Django accepts one in a column alias today and refuses it from Django 7.0, so rename the total before you upgrade.

{@api py:function:vueda.info.checks.check_column_totals_configuration} checks registered viewsets only. A viewset routed without {@term Canonical Registration} is not checked, and a path through a multi-valued relation on it inflates totals without any error.

::: warning
Django does not run system checks when a WSGI application starts. Run `manage.py check` in your build or deploy pipeline.
:::

## Request Totals

A `list` request names the totals it wants in the `ct` query parameter:

```text
GET /routes/billing/invoice/?ct=subtotal,product_price
```

- Repeating the parameter (`?ct=subtotal&ct=product_price`) means the same as a comma-separated value.
- A wildcard value, `*` or `~all`, requests every declared total.
- Empty values and duplicates are dropped, so `?ct=` alone requests nothing.
- A name the viewset does not declare returns a `400` that lists the valid totals, even when a wildcard is also sent.
- `retrieve` rejects `ct`, and a total name is never a valid {@term Sparse Fields} `f` value.

A request that names no totals gets `columnTotals: {}` and runs no aggregation query. Each requested total adds one `SUM`.

Totals cover the rows that the filter backends and {@term Row-Level Permissions} leave, across all pages, so every page reports the same totals. [Row-Level Permission Filtering](../core-concepts/row-level-permission-filtering.md#list-response-contract) describes that order. [#317](https://github.com/arrai-innovations/vueda/issues/317) tracks permission-aware aggregates.

The paginated response carries the requested totals beside the rows:

```json
{
    "results": [...],
    "columnTotals": {
        "subtotal": 12345.67,
        "product_price": 13580.24
    },
    "perPage": 10,
    "totalPages": 5,
    "totalRecords": 47
}
```

Every requested name is present, and every value is a number. A filter that matches no rows totals `0`. A `DurationField` total is a number of seconds, as {@api py:class:vueda.core.renderers.VuedaJSONRenderer} encodes it. VUEDA's default settings make it the default renderer.

The server computes totals in the request that returns them and never caches them. A client that builds its own requests names every total it wants on each request, and replaces its totals with each response.

Declaring `column_totals` also documents `ct` on the viewset's `list` operation in the generated OpenAPI schema, with that viewset's total names. [`get_override_parameters`]{@api py:function:vueda.core.open_api.VuedaBaseAutoSchema.get_override_parameters} describes the parameter.

## Discover Totals from Model Info

The [`model_column_totals`]{@api py:function:vueda.info.serializers.ModelInfoSerializer.get_model_column_totals} section of model info lists the declared total names, in declaration order:

```text
GET /routes/vueda.info/model_info/billing/invoice/?e=model_column_totals
```

```json
{
    "model_column_totals": {
        "fields": ["subtotal", "tax", "product_price"]
    }
}
```

The section does not name the query parameter. The server reads it from the `COLUMN_TOTALS_PARAM` setting, and VUEDA's client sends the [`COLUMN_TOTALS_PARAM`]{@api js:property:@arrai-innovations/vueda/utils/constants#COLUMN_TOTALS_PARAM} constant. If you rename the setting, change the client constant to match, as [Wire Query Parameter Namespace](../core-concepts/configuration-surface-and-defaults.md#wire-query-parameter-namespace) describes. [#301](https://github.com/arrai-innovations/vueda/issues/301) tracks discovering the name in the client.

## Render Totals in `ViewList`

{@api vue:component:ViewList} renders declared totals with no client configuration. {@api js:function:@arrai-innovations/vueda/use/useViewList#useViewList} requests the advertised totals whose names match a visible display column. Hiding the last totalled column stops the request for totals.

The footer is a table row, so card layout requests no totals. [ObjectsGrid](../reference/components/objectsgrid.md) describes when the grid switches to table layout at its `tableBreakpoint`. A list shell that calls `useViewList` directly passes it the same [`tableBreakpoint`]{@api js:property:@arrai-innovations/vueda/use/useViewList#ViewListOptions.tableBreakpoint} it gives `ObjectsGrid`.

In all-pages mode, {@api js:function:@arrai-innovations/vueda/utils/listCrud#allPagePaginatedListCrudAdaptor} requests totals on the first page only, since every page carries the same totals.

### Format One Column's Total

The default footer shows each total as its raw number. Replace one cell with the [`field(<name>)totals`]{@api vue:component:ViewList:slots} slot, which receives the total as `value`. This list shows a `DurationField` total with {@api vue:component:DurationDisplay}:

```vue
<script setup>
import DurationDisplay from "@vueda/display/duration-display/DurationDisplay.vue";
import ViewList from "@vueda/views/ViewList.vue";
</script>

<template>
    <view-list app="billing" model="timesheet">
        <template #[`field(hours)totals`]="{ value }">
            <duration-display :value="value" inline />
        </template>
    </view-list>
</template>
```

### Replace the Footer Row

The [`row-after-objects`]{@api vue:component:ViewList:slot:row-after-objects} slot replaces the whole footer. It receives `columnTotals` and `class`, the grid's row classes. `columnTotals` is empty in card layout, so render the row only when it has totals:

```vue
<view-list app="billing" model="invoice">
    <template #row-after-objects="{ class: rowClass, columnTotals }">
        <div v-if="Object.keys(columnTotals).length" :class="rowClass" role="row">
            <div role="cell">Totals</div>
            <div role="cell">{{ columnTotals.subtotal }}</div>
            <div role="cell">{{ columnTotals.product_price }}</div>
        </div>
    </template>
</view-list>
```

The slot receives only the totals that `useViewList` requested. `useViewList` rewrites the `ct` parameter whenever the visible columns or the layout change. To show the total of a column the list does not display, add that column to `displayFields`, or fetch the total with a request of your own.

## Check the Result

- `manage.py check` reports no `vueda_info.E013` for the viewset.
- A `list` request without `ct` returns `columnTotals: {}`.
- A request naming one declared total returns only that key, under its declared name.
- A wildcard returns every declared total.
- Totals change when you apply a filter, and when a user with row-level restrictions views the list.
- Totals are the same on every page.
- A filter that matches no rows returns `0` totals.
- The table footer shows each total under its column.

## Troubleshooting

**`columnTotals` is missing from the response.** The viewset uses a pagination class other than `VUEDAPageNumberPagination` or a subclass that keeps its `get_paginated_response`. A bare array means pagination is off, and no totals are computed.

**`columnTotals` is `{}`.** The request named no totals. In `ViewList`, check that the totalled column is visible, the list is in table layout, and `model_column_totals` lists the total.

**A declared total never appears.** Its name matches no display column, so the client never requests it. `useViewList` logs a `console.error` naming the total. Rename the total to match its column, or add the column to `displayFields`.

**A `400` lists the valid totals.** The request named a total the viewset does not declare. Total names are the keys of `column_totals`; the ORM paths are not valid names.

**Every list request is a `400`, or totals are never computed, after renaming `COLUMN_TOTALS_PARAM`.** The client still sends `ct`. A viewset that rejects unknown query parameters answers `400`, and one that ignores them computes no totals. Change the client constant to match the setting.

**A totals request raises `NotImplementedError`.** The list queryset picks one row per group with `distinct(...)` on a queryset annotation. `get_column_info` describes which `DISTINCT ON` querysets it can total.

**A total changes when another total is requested with it.** A path reaches through a relation that matches more than one row. Run `manage.py check`, and register the viewset if the check does not report it.

**Totals do not match the listed rows.** A customized `list` computes totals before `apply_row_level_filter`, or over the page. Call `get_column_info` on the filtered queryset, as the default `list` does.

**A duration total arrives as a string, such as `"3600.0"`.** DRF's `JSONRenderer` rendered the response. A project that sets `DEFAULT_RENDERER_CLASSES` itself, or sets `renderer_classes` on a viewset, keeps DRF's encoding. Use `VuedaJSONRenderer` there.

**A total is `null`.** An overridden `get_column_info` calls `aggregate()` with a `Sum` that has no `default`. The default method sums with a zero `default`.
