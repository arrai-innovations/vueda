---
title: Expose Aggregates in `list` Responses
type: how-to
audience: integrator
status: draft
---

# Expose Aggregates in `list` Responses

This guide covers adding aggregate column totals to `list` responses and rendering them in the default list UX. Column totals let a `list` view display summary values (sums) for numeric columns, computed from the same filtered queryset that produces the visible rows.

The guide assumes familiarity with VUEDA's `list` view pipeline. For the interaction between row-level permission filtering and aggregates, see [Row-Level Permission Filtering](../core-concepts/row-level-permission-filtering). For the pagination response shape, see the generated API reference for the pagination class.

## Goal and Preconditions

The objective is a `list` endpoint where:

- Numeric columns declared as totals produce `SUM` aggregates in the response payload.
- Aggregates reflect the same filtered queryset as the listed rows (filters, row-level permissions applied).
- The client renders totals in the `list` view's footer row.

Before you begin:

The model's viewset must inherit from `VuedaViewSet` or `VuedaHistoryViewSet`, both of which include {@api py:class:vueda.core.viewsets.ListRowLevelViewSetMixin}. The `list` method on this mixin handles the aggregation pipeline.

The `list` endpoint must use VUEDA's pagination class ({@api py:class:vueda.core.pagination.VUEDAPageNumberPagination}), which includes `columnTotals` in the paginated response. Custom endpoints that bypass VUEDA pagination will not include column totals.

## Server Aggregation Setup

Declare totalable columns on the viewset using the `column_totals` attribute:

```python
class InvoiceViewSet(VuedaViewSet):
  serializer_class = InvoiceSerializer
  queryset = Invoice.objects.all()
  column_totals = ["subtotal", "tax", "total"]
```

Each entry in `column_totals` should be a field name that the database backend can `SUM`. Typically, these are `DecimalField`, `IntegerField`, or `FloatField` columns. Non-aggregatable fields (strings, booleans, relations) will fail at the database query level when the `SUM` is attempted.

An entry can also be a double-underscore relation lookup, such as `product_option__quantity_available`, to total a numeric field reached through a foreign key. `column_totals` feeds directly into a queryset `Sum()` aggregation rather than the serializer's field list, so any lookup Django's `aggregate()` accepts is valid.

When `column_totals` is empty (the default), the server aggregate payload is `{}` and no aggregation query runs.

## Requesting a Subset of Totals

By default, a `list` request returns every field declared in `column_totals`. A client can request a subset by including the wanted column-total field name(s) in the sparse `fields` query parameter (`f`) alongside whichever row fields it needs:

```text
GET /routes/myapp/invoice/?f=id,subtotal,tax
```

Only `subtotal` and `tax` appear in `columnTotals`; `total` is omitted because it was not requested. If `fields` is omitted entirely, or submitted with a wildcard value (`*` or `~all`), every declared `column_totals` field is returned, same as the default.

Column-total field names are aggregate-only: {@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.validate_flex_expand_and_field_param} recognizes them in the `fields` param, computes the corresponding aggregate, and strips them from the row-level field selection before the serializer runs. This has two consequences:

- Requesting a `column_totals` field name in `fields` does not appear as a column on the objects in `results`, even though it is accepted.
- It also does not trigger the "invalid field" `400` response that an unrecognized `fields` value would normally produce, because the viewset treats `column_totals` names as a distinct, valid vocabulary from serializer fields.

## Filter and Permission Semantics

Totals are computed from the queryset after both DRF filter backends and row-level permission filtering have been applied, but before pagination. This means:

- **Filters affect totals.** If a user applies a filter that narrows the list to 10 of 100 rows, the totals reflect those 10 rows.
- **Row-level permissions affect totals.** If row-level filtering hides 50 rows from a user, the totals reflect only the 50 visible rows.
- **Pagination does not affect totals.** Totals are computed pre-pagination, so they reflect the full filtered set regardless of which page the user is viewing.

This ordering is enforced by `ListRowLevelViewSetMixin.list`, which first calls `apply_row_level_filter`, then `get_column_info` on the filtered queryset, and finally paginates.

## Response Contract

The paginated `list` response includes a `columnTotals` key alongside `results`, `totalRecords`, and `totalPages`:

```json
{
  "results": [...],
  "totalRecords": 47,
  "totalPages": 5,
  "columnTotals": {
    "subtotal": "12345.67",
    "tax": "1234.57",
    "total": "13580.24"
  }
}
```

When `column_totals` is empty, `columnTotals` is `{}`. When the filtered queryset is empty, aggregate values may be `null` (the database returns `NULL` for `SUM` over zero rows). The client should handle `null` values defensively.

When a request's `fields` param requests only a subset of the declared `column_totals` (see [Requesting a Subset of Totals](#requesting-a-subset-of-totals)), `columnTotals` contains only the requested keys.

## Client Rendering Strategy

On the client, list {@term CRUDL} adaptors (`singlePagePaginatedListCrudAdaptor`, `allPagePaginatedListCrudAdaptor`) copy `responseData.columnTotals` into `list` state. The data is available to the `list` view's rendering pipeline.

`ViewList` renders totals through the `row-after-objects` slot. The default rendering produces a footer row in table mode with the total values aligned to their respective columns.

To customize the totals display, override the `row-after-objects` slot:

```vue
<ViewList>
  <template #row-after-objects="{ columnTotals }">
    <tr class="totals-row">
      <td>Totals:</td>
      <td>{{ columnTotals.subtotal }}</td>
      <td>{{ columnTotals.tax }}</td>
      <td>{{ columnTotals.total }}</td>
    </tr>
  </template>
</ViewList>
```

Be aware that custom `row-after-objects` slot implementations replace the default totals rendering entirely. If the slot is provided but does not render the totals, the totals will not be visible even though the data is present in the response.

## Verification Checklist

After implementing column totals, verify:

- `list` response includes `columnTotals` with the declared field names and aggregate values.
- Totals change when filters are applied (they reflect the filtered set, not the full table).
- Totals change when a different user with row-level restrictions views the same list (they reflect only visible rows).
- Totals remain consistent across pages (pre-pagination aggregation).
- Empty result sets produce `null` or `0` totals without errors.
- The `list` view renders totals in the default footer row or through a custom slot.
- Non-aggregatable fields in `column_totals` produce clear database errors (test this in development, not production).
- Requesting a subset of declared totals via `fields` returns only the requested keys in `columnTotals`, and omitting `fields` (or submitting a wildcard) returns all of them.

## Troubleshooting

**`columnTotals` is missing from the response.** The endpoint is not using VUEDA's pagination class. Custom endpoints or overridden pagination classes may not include `columnTotals` in the response shape.

**`columnTotals` is `{}`.** The viewset's `column_totals` attribute is empty or not set. Add the field names you want to aggregate.

**Database error on `list` request.** A field in `column_totals` is not aggregatable (e.g., a string or boolean field). Remove it from the list or convert the column to a numeric type.

**Totals do not match visible rows.** Row-level filtering may be applied after aggregation in a customized list implementation. Ensure `apply_row_level_filter` runs before `get_column_info`. The default `ListRowLevelViewSetMixin.list` handles this correctly.

**Totals are not visible in the UI despite being in the response.** A custom `row-after-objects` slot may be overriding the default totals rendering without including totals output. Check the slot implementation.

**Totals include `null` values.** The filtered queryset for a column is empty, or the column contains only `NULL` values. The database returns `NULL` for `SUM` over zero rows. Handle this defensively in the UI with a fallback display value.

**A declared column total is missing from `columnTotals`.** The request's `fields` param requested a subset of fields that did not include that column-total field name. Add the field name to `fields`, submit a wildcard `fields` value, or omit `fields` entirely to get every declared total.

## Relevant Implementation Surface

- Python:
    - {@api py:class:vueda.core.viewsets.ListRowLevelViewSetMixin}
    - {@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.apply_row_level_filter}
    - {@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.get_column_info}
    - {@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.list}
    - {@api py:function:vueda.core.viewsets.NoExtraFieldsForViewSetMixin.validate_flex_expand_and_field_param}
    - {@api py:class:vueda.core.pagination.VUEDAPageNumberPagination}
    - {@api py:function:vueda.core.pagination.VUEDAPageNumberPagination.get_paginated_response}
- JavaScript:
    - {@api js:module:@arrai-innovations/vueda/utils/listCrud}
    - {@api js:function:@arrai-innovations/vueda/utils/listCrud#singlePagePaginatedListCrudAdaptor}
    - {@api js:function:@arrai-innovations/vueda/utils/listCrud#allPagePaginatedListCrudAdaptor}
- Vue.js Components:
    - {@api vue:component:ViewList}
