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

- A caller names the totals it wants, and the server aggregates only those.
- Aggregates reflect the same filtered queryset as the listed rows (filters, row-level permissions applied).
- The client discovers which columns can carry a total from model info, and renders them in the `list` view's footer row.

Before you begin:

The model's viewset must inherit from `VuedaViewSet`, which includes {@api py:class:vueda.core.viewsets.ListRowLevelViewSetMixin}. The `list` method on this mixin handles the aggregation pipeline.

The `list` endpoint must use VUEDA's pagination class ({@api py:class:vueda.core.pagination.VUEDAPageNumberPagination}), which includes `columnTotals` in the paginated response. Custom endpoints that bypass VUEDA pagination will not include column totals.

## Server Aggregation Setup

Declare totalable columns on the viewset using the `column_totals` attribute. It is a mapping of client-facing column name to the ORM field path aggregated for it:

```python
class InvoiceViewSet(VuedaViewSet):
  serializer_class = InvoiceSerializer
  queryset = Invoice.objects.all()
  column_totals = {
      "subtotal": "subtotal",
      "tax": "tax",
      "product_price": "product_option__price",
  }
```

The key is what a client asks for and what comes back in `columnTotals`. The value is a server-side detail the client never sees. Keeping the two apart is the point of the mapping: a total lands under the column name that renders it, whatever the ORM path behind it is spelled like. A serializer field named `price` with `source="product_option.price"` is rendered in a column named `price`, so the total for it is declared as `{"price": "product_option__price"}`.

Two rules apply to every value, and a Django system check enforces both (see [Validation](#validation) below):

- The path must land on a column the database can `SUM`: a numeric field, or a `DurationField`. A `CharField`, `BooleanField`, `DateField`, or a relation itself is an error. A `DurationField` total arrives as a number of seconds, so a footer rendering one needs to format it for the reader; every other summable column keeps its own scale.
- The path may only reach through relations that match at most one related row: a forward foreign key or a one-to-one, nullable or not. A reverse foreign key, a many-to-many, or a `GenericRelation` is an error, because the totals over real columns are computed in one `aggregate()` call and such a join adds a row per related object — which inflates every one of them, not only the total that named the relation.

### Totalling a Queryset Annotation

A path may also name an annotation the viewset's own `get_queryset` adds, rather than a column the model has:

```python
class InvoiceLineViewSet(VuedaViewSet):
    queryset = InvoiceLine.objects.all()
    serializer_class = InvoiceLineSerializer
    column_totals = {"line_total": "line_total"}

    def get_queryset(self):
        return super().get_queryset().annotate(line_total=F("quantity") * F("unit_price"))
```

The check resolves the viewset's queryset to find out, and accepts a path naming one of its annotations. This is the same allowance ordering makes for an annotation named in `ordering` or `ordering_fields`, for the same reason — see [Queryset annotations](../core-concepts/filtering-and-ordering-semantics#queryset-annotations). What the annotation computes is yours to get right: neither of the two rules above can be checked against it, because there is no model field behind it to read a type or a join from.

Two limits come with it:

- **The queryset has to be buildable at check time.** A `get_queryset` that reaches for `self.request` cannot run without one, so the check cannot see its annotations and skips the path rules entirely rather than reporting a path it cannot judge. The names are still checked.
- **An annotation has to have a value per row.** Row multiplication is handled for both kinds of total, by different routes: a total over a real column is summed over the matched rows re-selected by primary key, while an annotation — which cannot be moved onto that re-selection, because the expressions on a queryset are resolved against it and carry its table aliases — is summed over a distinct `(primary key, value)` subquery instead. Either way a matched row counts once. What neither route can do is total an annotation that reads the multi-valued side of a join, such as `F("special_care__id")`: that has a value per _joined_ row rather than per row, so there is no per-row total to compute. Exact duplicates still collapse, but a row with three related rows genuinely has three values.

Where the value needs a join or an aggregate, prefer a real column over an annotation — the same ladder ordering recommends:

- **A `GeneratedField`**, where the value derives from other columns on the same row. The database computes and persists it, and it resolves like any other field.
- **A database view**, where the value needs a join or an aggregate. Model the view as a `managed = False` model with the columns it exposes, relate it to the model with a `OneToOneField`, and total through the relation. This is the pattern `Customer` and `CustomerData` use in the test suite.

A real column gets both rules checked for you, and a view can compute anything the annotation could.

## Requesting Totals

Totals are opt-in. A `list` request names the ones it wants in the column totals query parameter, which defaults to `ct` and is configured by the top-level `COLUMN_TOTALS_PARAM` setting:

```text
GET /invoices/?ct=subtotal,product_price
```

- Repeating the parameter (`?ct=subtotal&ct=product_price`) and comma-separating one value mean the same thing.
- A wildcard value, `*` or `~all` — the same spellings `?e=` and `?f=` accept — requests every declared total.
- Empty values and duplicates are dropped, so `?ct=` on its own requests nothing.
- A name the viewset does not declare is a `400` listing the valid totals, even when a wildcard is sent alongside it.

A request that names no totals gets `columnTotals: {}` and runs no aggregation query at all, so a declared total costs nothing until someone asks for it. Asking for one of three declared totals adds one `SUM` to the queryset, not three.

The totals parameter is separate from the sparse-fields parameter. `f` selects row fields only, and a total name is never a valid `f` value. The parameter is accepted on `list` and rejected on `retrieve`, which returns one object and has nothing to total.

## Discovering Totals

Model info advertises the declared totals through the `model_column_totals` section, requested like any other:

```text
GET /routes/vueda.info/model_info/store/cartitem/?e=model_column_totals
```

```json
{
    "model_column_totals": {
        "fields": ["quantity", "product_price"]
    }
}
```

`fields` are the declared total names, in declaration order. The section reports which totals exist, not the parameter that asks for them: a client sends that from its own constant (`COLUMN_TOTALS_PARAM` in `@vueda/utils/constants` for VUEDA's client), and a project changing `settings.COLUMN_TOTALS_PARAM` needs the matching client change, as it does for every wire parameter. See [Wire Query Parameter Namespace](../core-concepts/configuration-surface-and-defaults#wire-query-parameter-namespace).

This is a section of its own rather than a flag on each `model_fields` entry, because the two do not line up: `model_fields` is built from the canonical serializer, while `column_totals` lives on the viewset and names its totals after the client's columns. A total named `product_price` that matches no serializer field would have nowhere to be reported otherwise.

Declaring `column_totals` also documents the parameter in the generated OpenAPI schema, on that viewset's `list` operation and enumerated with that endpoint's own total names. There is nothing to configure for it, and a viewset that declares no totals documents no parameter. See [Wire Query Parameter Namespace](../core-concepts/configuration-surface-and-defaults#wire-query-parameter-namespace) for how that works.

## Filter and Permission Semantics

Totals are computed from the queryset after both DRF filter backends and row-level permission filtering have been applied, and from that queryset rather than from the page cut out of it. This means:

- **Filters affect totals.** If a user applies a filter that narrows the list to 10 of 100 rows, the totals reflect those 10 rows.
- **Row-level permissions affect totals.** If row-level filtering hides 50 rows from a user, the totals reflect only the 50 visible rows.
- **Pagination does not affect totals.** A total covers the whole filtered set regardless of which page the user is viewing, and is the same number on every page.

This ordering is enforced by `ListRowLevelViewSetMixin.list`, which first calls `apply_row_level_filter`, then paginates, then `get_column_info` on the filtered queryset — not on the page, so a total covers the whole filtered set rather than the rows currently shown.

Each matched row is summed once, whatever the query had to join to match it, so a filter or a search that reaches across a reverse foreign key or a many-to-many does not multiply the totals the way it would multiply rows. `get_column_info` re-selects the matched rows by primary key before totalling a real column, and totals an annotation over a distinct `(primary key, value)` subquery, which reaches the same result for a value that cannot be moved off the queryset it was annotated onto. This is separate from the rule on declared paths above: that rule is about the path a total names, this is about how the request found its rows.

A list queryset that picks one row per group with `distinct(...)` (a `DISTINCT ON` that leaves out the primary key) gets totals over the rows it lists. The re-selection keeps the queryset's ordering and distinct fields, which decide the row each group keeps. A `DISTINCT ON` that names a queryset annotation cannot be carried into that re-selection, so a totals request over such a queryset raises `NotImplementedError`.

Totals need a paginated response to travel in. A viewset with `pagination_class = None` returns a bare array of rows, which has no `columnTotals` to carry, so no aggregation runs for one however the request asks. Such a viewset should not declare `column_totals`.

## Response Contract

The paginated `list` response includes a `columnTotals` key alongside `results`, `totalRecords`, and `totalPages`, carrying exactly the totals the request asked for:

```json
{
  "results": [...],
  "totalRecords": 47,
  "totalPages": 5,
  "columnTotals": {
    "subtotal": 12345.67,
    "product_price": 13580.24
  }
}
```

When the request names no totals, `columnTotals` is `{}`. Otherwise every name the request asked for is present and every value is a number — a total is never `null`.

That last part is VUEDA's doing rather than the database's. `SUM` over zero rows is `NULL` in SQL, so a filter matching nothing would otherwise produce `{"subtotal": null}`. Each total is aggregated with a zero as its `default`, so it comes back as `0` instead. The sum of nothing is zero in the way a reader thinks about a total, a footer cell is the wrong place to explain the difference between "no rows" and "no total", and a client never has to tell those apart.

### Totals Travel With the Rows

Totals are computed during the `list` request that returns them, from the same queryset that produced `results`. They are not fetched separately and never cached across requests, so a total is always exactly as fresh as the rows shown beside it.

That matters because the underlying data changes. A total held over from an earlier request could describe rows that may since have been created, edited, or deleted, and the reader would have no way to tell that the footer and the table disagree. Recomputing on every list is what keeps the two in step.

The practical consequence for a caller: **ask for every total you want on every request**. There is no way to ask for one more total and keep a previously fetched one, and no reason to want it. A response replaces the whole `columnTotals` map — a key the request did not ask for is absent from it, and a client that merges responses rather than replacing would reintroduce exactly the staleness this avoids. VUEDA's own client does this correctly; see [Client Rendering Strategy](#client-rendering-strategy).

## Validation

A misconfigured `column_totals` is reported by the `vueda_info.E011` system check, which names the viewset, the total, and the problem. It rejects:

- a `column_totals` that is not a mapping, including a viewset still declaring the older list-of-paths form;
- a key `aggregate()` could not use as a column alias;
- a key a client could not ask for: one containing a comma, an empty one, or one of the wildcard spellings;
- a value whose path resolves to neither a field on the model nor an annotation the viewset's own `get_queryset` adds;
- a value that reaches through a relation matching more than one related row;
- a value whose resolved leaf field cannot be summed.

The last two apply to model fields only. A path naming a queryset annotation is accepted and checked no further, and the three path rules are skipped altogether when the queryset cannot be built without a request — see [Totalling a Queryset Annotation](#totalling-a-queryset-annotation).

It does not check the key against anything client-side; see below.

The alias half of that is asked of Django rather than restated, so a key is held to the rule the installed Django enforces — currently no quotation marks, brackets, backticks, whitespace, control characters, semicolons, hashes, or SQL comment markers. Nothing else about a key's spelling is constrained. A name is a JSON object key on the way back and is read as `columnTotals[name]`, so `sales.total` or `2024_total` are as workable as `product_price`, whatever they would mean as a variable in either language.

The one name Django is still deciding about is a percent sign, which it deprecated in 6.0 and removes in 7.0. VUEDA follows: a total whose name contains one is accepted, and reported as the `vueda_info.W002` warning rather than an error, so a project keeps the behavior its Django gives it today and hears about the upgrade that ends it at `manage.py check` time rather than when a list request starts failing. On Django 5.2 there is no deprecation to report, so such a name is simply accepted.

The key a client sends has to survive being read back out of the query parameter that carries it, which is where the rest comes from: the parameter separates names with commas and drops empty values, so a name containing a comma arrives as fragments matching no declared total, and an empty name never arrives at all. Both are totals no client could request. The wildcard spellings are compared exactly, so only `*` and `~all` themselves are reserved — `*a`, `**`, and `load~all` are ordinary names.

::: warning
Django does not run system checks when starting a WSGI application. Run `manage.py check` in your build or deploy pipeline for any of these to be reported before a release ships.
:::

Only registered viewsets are checked, which in practice means all of them: registration is one viewset per model and a second registration for the same model fails at startup, so a model's totals are either checked or the model has no metadata surface at all. A viewset routed without being registered is the exception, and it declares its totals unchecked — worth knowing because the rule about multi-valued relations is the one nothing else enforces: such a path raises no error at any point and quietly inflates every total computed alongside it.

A second CRUDL surface over the same data is a proxy model, which registers in its own right and is checked like any other — see [Canonical Registration and Model Discovery](../core-concepts/canonical-registration-and-discovery).

The check cannot tell you that a total name matches a column the client actually renders. `{"prcie": "price"}` passes every rule above and still renders nowhere, because no display column is named `prcie`. The server has no way to know better: total names are client column names, and `displayFields` is configured per project and per view.

Nothing breaks when this happens — a client only asks for totals matching the columns it displays, so an unmatched total is never requested and costs no aggregation. But nothing renders either, so `useViewList` logs a `console.error` naming the total when a model advertises one that matches none of its configured display columns. That is a report, not a guarantee: a project with its own list shell is on its own here, and the metadata still advertises the total.

## Client Rendering Strategy

On the client, list {@term CRUDL} adaptors (`singlePagePaginatedListCrudAdaptor`, `allPagePaginatedListCrudAdaptor`) copy `responseData.columnTotals` into `list` state. The data is available to the `list` view's rendering pipeline.

`useViewList` builds the request itself: it takes the totals the server advertises (`modelConfig.config.totalables`), intersects them with the columns currently visible, and sends them under `COLUMN_TOTALS_PARAM`. No app-specific configuration is needed for a declared total to render. Hiding the last totalled column stops the request asking for totals; showing it again restores both the request and the footer value.

Card layout asks for none of them. The footer is a table row, and the grid renders it only above its table breakpoint, so a narrow viewport has nowhere to put a total and does not pay for one. Crossing back above the breakpoint asks again.

`useViewList` decides this before the first request, seeding the layout from its own `tableBreakpoint` option rather than waiting for the grid to mount and report one. A shell that calls the composable directly should pass the same `tableBreakpoint` it gives `ObjectsGrid` — both default to `lg`, so they agree unless one is overridden alone.

In "all pages" mode, `allPagePaginatedListCrudAdaptor` asks for totals on the first page only. The totals describe the whole filtered set rather than one page of it, so every page would return the same numbers, and asking on each one would run the aggregation once per page.

It always sends the whole set it wants, never a delta, so showing a second totalled column re-requests both totals in one list request rather than topping up the first with a second. On the receiving side the list state replaces its totals with whatever the response carried, and clears them alongside the rows when a page or search change clears the list. A total therefore never outlives the rows it was computed from.

`ViewList` renders totals through the `row-after-objects` slot. The default rendering produces a footer row in table mode with the total values aligned to their respective columns, each looked up by display column name. A single column's cell can be overridden through the `field(<name>)totals` slot.

To customize the totals display wholesale, override the `row-after-objects` slot:

```vue
<ViewList>
  <template #row-after-objects="{ columnTotals }">
    <tr class="totals-row">
      <td>Totals:</td>
      <td>{{ columnTotals.subtotal }}</td>
      <td>{{ columnTotals.product_price }}</td>
    </tr>
  </template>
</ViewList>
```

Be aware that custom `row-after-objects` slot implementations replace the default totals rendering entirely. If the slot is provided but does not render the totals, the totals will not be visible even though the data is present in the response.

A custom footer also only receives the totals `useViewList` asked for, which are the ones matching currently visible display columns. A slot that wants a total for something that is not a display column will not find it in `columnTotals`, because it was never requested. The same applies below the table breakpoint: `columnTotals` is empty there, so a custom slot that renders totals in card layout has nothing to render. Such a view needs to request the totals itself rather than rely on the default request.

## Verification Checklist

After implementing column totals, verify:

- `manage.py check` reports no `vueda_info.E011` for the viewset, and no `vueda_info.W002` unless a total's name deliberately contains a percent sign.
- The totals parameter appears on the viewset's `list` operation in the generated OpenAPI schema, enumerating the declared total names (if the project generates one).
- A `list` request with no totals parameter returns `columnTotals: {}` and issues no `SUM`.
- A `list` request naming one of several declared totals returns only that key, and adds only that one `SUM`.
- A wildcard (`*` or `~all`) returns every declared total.
- A total declared over a relation path comes back under its declared name, not the ORM path.
- A total is worth the same alone as it is alongside another total.
- Totals change when the underlying rows change, on the next list request and without any separate refresh.
- Totals change when filters are applied (they reflect the filtered set, not the full table).
- Totals change when a different user with row-level restrictions views the same list (they reflect only visible rows).
- Totals remain consistent across pages, because each one covers the whole filtered set rather than the page.
- An empty result set produces a `0` total, not `null` and not an error.
- The `list` view renders totals in the default footer row or through a custom slot.

## Troubleshooting

**`columnTotals` is missing from the response.** The endpoint is not using VUEDA's pagination class. Custom endpoints or overridden pagination classes may not include `columnTotals` in the response shape. If the response is a bare array rather than an object, the viewset has pagination disabled entirely — there is nowhere for totals to go, and none are computed.

**`columnTotals` is `{}`.** The request named no totals. Totals are opt-in: send the totals parameter (`ct` by default), or a wildcard for all of them. If the client builds the request itself, check that the column carrying the total is visible and that `model_column_totals` advertises it.

**A `400` naming the valid totals.** The request named something the viewset does not declare. Total names are the keys of `column_totals`, not the ORM paths behind them.

**Every list request is a `400`, or totals are silently never computed, after changing `COLUMN_TOTALS_PARAM`.** The client sends the parameter from a constant of its own, so renaming the setting without renaming `COLUMN_TOTALS_PARAM` in `@vueda/utils/constants` leaves the two disagreeing. The failure depends on which strict-parameter mixins the viewset carries: a viewset rejecting unknown parameters answers `400`, and one that ignores them treats every request as asking for no totals.

**The footer disagrees with the rows.** Totals are computed in the same request as the rows, so they cannot drift on their own. Suspect a client that caches or merges `columnTotals` across requests instead of replacing the map with each response.

**A declared total never appears in any response.** The declared name matches no display column, so the client never asks for it. Check the browser console for the `useViewList` error naming it, then either rename the total in `column_totals` to match the column it belongs under, or add that column to `displayFields`.

**`manage.py check` reports `vueda_info.E011`.** Read the hint; each of the failures above has a different answer. The check reports the viewset, the total's name, and the path. When the key is one Django refuses as a column alias, the hint quotes Django's own message, so it says what the installed version objects to.

**`manage.py check` reports `vueda_info.W002`.** The total's name contains a percent sign. It works today, because Django accepts one in a column alias, but Django 7.0 removes that and every list request asking for the total will then be a server error. Rename the total before upgrading.

**Totals do not match visible rows.** Row-level filtering may be applied after aggregation in a customized list implementation. Ensure `apply_row_level_filter` runs before `get_column_info`. The default `ListRowLevelViewSetMixin.list` handles this correctly.

**A total's value changed when another total was requested alongside it.** A declared path reaches through a relation that matches more than one row, which the check rejects for exactly this reason. Run `manage.py check`.

**Totals are not visible in the UI despite being in the response.** A custom `row-after-objects` slot may be overriding the default totals rendering without including totals output. Check the slot implementation.

**A duration total arrives as a string, such as `"3600.0"`.** A `DurationField` total reaches the renderer as a `timedelta` without passing through a serializer field, and DRF's own JSON encoder writes one as a string. VUEDA's `VuedaJSONRenderer` encodes it as a number of seconds instead. A project that sets `DEFAULT_RENDERER_CLASSES` itself, or names `rest_framework.renderers.JSONRenderer` on a viewset's `renderer_classes`, keeps DRF's encoding; point those at the VUEDA renderer.

**A total is `null`.** It should not be: each total is aggregated with a zero `default`, so an empty filtered set totals `0`. A `null` means something other than `ListRowLevelViewSetMixin.get_column_info` computed it — an overridden `get_column_info` calling `aggregate()` with a bare `Sum`, most likely.

**A total is `0` when the column has values.** The filter matched no rows, which is what `0` means here. Check the filters and any row-level permission filtering in play: totals are computed from the same queryset that produced the rows, so an empty `results` and a zero total agree with each other.

## Relevant Implementation Surface

- Python:
    - {@api py:class:vueda.core.viewsets.ListRowLevelViewSetMixin}
    - {@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.apply_row_level_filter}
    - {@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.get_column_info}
    - {@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.list}
    - {@api py:class:vueda.core.pagination.VUEDAPageNumberPagination}
    - {@api py:function:vueda.core.pagination.VUEDAPageNumberPagination.get_paginated_response}
    - {@api py:module:vueda.core.renderers}
    - {@api py:class:vueda.core.open_api.VuedaBaseAutoSchema}
    - {@api py:module:vueda.info.checks}
- JavaScript:
    - {@api js:module:@arrai-innovations/vueda/utils/listCrud}
    - {@api js:function:@arrai-innovations/vueda/utils/listCrud#singlePagePaginatedListCrudAdaptor}
    - {@api js:function:@arrai-innovations/vueda/utils/listCrud#allPagePaginatedListCrudAdaptor}
- Vue.js Components:
    - {@api vue:component:ViewList}
