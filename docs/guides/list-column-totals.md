---
title: Expose Aggregates in List Responses
type: how-to
audience: implementor
status: briefing
---

# Expose Aggregates in List Responses

## Intent and Scope

- Add aggregate column totals to list responses and render them in default list UX.
- Ground implementation in server query flow and client list adaptors/components.
- Treat this as a technical briefing: what to implement and what must remain true.

## Non-goals

- Not a general analytics/reporting guide.
- Not a replacement for source-level behavior validation in tests.
- Not a guarantee for non-paginated custom endpoints that bypass VUEDA pagination behavior.

## Key Tasks

### 1. Declare total columns on the viewset

- Set `column_totals = [...]` on the model viewset that serves the list.
- Keep fields limited to aggregatable columns that your DB backend can `SUM`.
- Source anchors: `server/vueda/core/viewsets/__init__.py`, `server/tests/viewsets.py`.

### 2. Preserve queryset semantics before aggregation

- Totals are computed after `filter_queryset(...)` and `apply_row_level_filter(...)`.
- This means list filters and row-level permission constraints affect totals as well as rows.
- Source anchors: `server/vueda/core/viewsets/__init__.py`.

### 3. Expose totals via paginated response payload

- VUEDA pagination includes `columnTotals` in paginated list responses.
- Ensure list endpoints use VUEDA pagination path if clients depend on this key.
- Source anchors: `server/vueda/core/pagination.py`, `server/tests/unit/core/test_pagination.py`.

### 4. Consume totals in list CRUD adaptor and view

- List CRUD adaptors copy `responseData.columnTotals` into list state.
- `ViewList` exposes totals through `row-after-objects` slot and default totals row rendering.
- Source anchors: `client/lib/utils/listCrud.js`, `client/lib/views/ViewList.vue`.

### 5. Verify totals against real list interactions

- Test totals for filtered data and empty/edge results.
- Verify UI still renders correctly for both default totals row and custom slot overrides.
- Source anchors: `server/tests/unit/core/test_pagination.py`, `client/tests/unit/lib/views/ViewList.spec.js`.

## Relevant Implementation Surface

- Python:
- `{@api py:class:vueda.core.viewsets.ListRowLevelViewSetMixin}`
- `{@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.apply_row_level_filter}`
- `{@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.get_column_info}`
- `{@api py:function:vueda.core.viewsets.ListRowLevelViewSetMixin.list}`
- `{@api py:class:vueda.core.pagination.VUEDAPageNumberPagination}`
- `{@api py:function:vueda.core.pagination.VUEDAPageNumberPagination.get_paginated_response}`
- JavaScript:
- `{@api js:module:@arrai-innovations/vueda.utils/listCrud}`
- `{@api js:function:@arrai-innovations/vueda.utils/listCrud.singlePagePaginatedListCrudAdaptor}`
- `{@api js:function:@arrai-innovations/vueda.utils/listCrud.allPagePaginatedListCrudAdaptor}`
- Vue.js Components:
- `{@api vue:component:ViewList}`

## Contracts and Invariants

- If `column_totals` is empty, server aggregate payload is `{}`.
- Totals are computed on the same filtered/row-permitted queryset as list rows.
- Paginated responses include `columnTotals` consistently.
- Default list UI reads totals from list state and renders them as a footer row in table mode.
- Source anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/core/pagination.py`, `client/lib/utils/listCrud.js`, `client/lib/views/ViewList.vue`.

## Footguns

- Non-aggregatable fields in `column_totals` can fail at query/DB level.
- If a list endpoint disables or replaces VUEDA pagination response shape, `columnTotals` may be absent.
- Custom `row-after-objects` slot implementations can accidentally hide totals output.
- Aggregates over nullable fields may return `null`/`None` values; format defensively in the UI.
- Source anchors: `server/vueda/core/viewsets/__init__.py`, `server/vueda/core/pagination.py`, `client/lib/views/ViewList.vue`.

## Suggested Outline

```md
## Goal and Preconditions
## Server Aggregation Setup
## Filter and Permission Semantics
## Response Contract
## Client Rendering Strategy
## Verification Checklist
## Troubleshooting
```
