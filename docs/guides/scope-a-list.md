---
title: Open a Scoped List
type: how-to
audience: integrator
status: draft
---

# Open a Scoped List

A **scope** is a list constraint that a link or application code supplies, with no editable filter input. For example, an action creates a batch of purchase orders and opens the purchase order list narrowed to that batch. {@api vue:component:ViewList} shows each active scope as a labeled chip in the constraints band, next to the filter and sort chips. A clearable chip has a clear control, so the reader can return to the full list.

A scope comes from one of two sources:

- **A hidden filter in the URL.** The server declares a filter with a hidden widget, and a link supplies its value as a query parameter.
- **A declared `params` key.** Application code passes the value through the `ViewList` `params` prop and declares the key as a scope through the `scopes` prop.

This guide assumes a working CRUDL surface (see [Create a CRUDL Surface](./create-crudl-surface)).

## Scope a List Through the URL

### Declare a Hidden Filter

Declare the filter on the viewset's filterset with a `HiddenInput` widget:

```python
from django import forms
from django_filters import rest_framework as filters
from vueda.core.filters import VuedaFilterSet

from your_project.purchasing.models import PurchaseOrder


class PurchaseOrderFilterSet(VuedaFilterSet):
    replenishment_batch = filters.UUIDFilter(widget=forms.HiddenInput)

    class Meta:
        model = PurchaseOrder
        fields = ["id", "supplier", "status", "replenishment_batch"]
```

The widget decides whether a filter is hidden. Model-info reports `hidden: true` for any filter whose widget is hidden. The filter's type and the model field's presentation elsewhere have no effect. A hidden filter:

- never appears in the add-filter menu,
- never becomes an editable filter chip,
- needs no client input mapping for its type, so a hidden `UUIDFilter` works without registering a UUID input.

`VuedaFilterSet` already declares a hidden `id` filter, which is why an `?id=1,2` link scopes any list to those records.

### Link to the Scoped List

Supply the filter's value as a query parameter on the list route:

```text
/purchasing/purchaseorder/list/?replenishment_batch=3f2a9c1e-8b7d-4e21-9a55-0c1d2e3f4a5b
```

From application code, build the same location with `getCRUDForTo`:

```js
import { getCRUDForTo } from "@vueda/router/getCrud.js";

await router.push(
    await getCRUDForTo({
        app: "purchasing",
        model: "purchaseorder",
        view: "list",
        query: { replenishment_batch: batch.id },
    }),
);
```

`ViewList` sends the value with every list request. Changing visible filters, the sort, or the search term keeps the value in both the URL and the request. Navigation that changes the value, such as following a link to another batch or using the browser's back button, returns the list to page 1.

Scope chips appear once the list's model metadata has loaded, because their labels and keys come from that metadata. The first list request waits for the same metadata, so the chips and the scoped rows arrive together.

### Keep the Filter in an Overridden `filterables` List

A `ViewList` recognizes a hidden filter only when the filter is in its resolved filterable list. That list is the server's filtering metadata unless the application overrides it through the `filterables` prop or the model config. When you override it, include the hidden filter:

```html
<view-list app="purchasing" model="purchaseorder" :filterables="['supplier', 'status', 'replenishment_batch']" />
```

A hidden filter left out of the override is not shown as a scope, and its URL value is not sent with the list request.

### Label the Scope

The chip label comes from the filter's `filterableDetails` entry: its `label` with the value, such as `Replenishment Batch · 3f2a9c1e-8b7d-4e21-9a55-0c1d2e3f4a5b`. When the value has several parts, such as an `in` lookup's comma-separated list or a range filter's suffixed keys, the chip shows a count instead. For the built-in `id` filter, whose server label is `Id Is In`, an `?id=1,2` link shows `Id Is In · 2 values`. A label too long for the constraints band is truncated with an ellipsis, and the full text is shown on hover.

To change the text, override the filter's `label`. A hidden filter has no filter input, so the label appears on the scope chip and in filter error messages:

```html
<view-list app="purchasing" model="purchaseorder" :filterable-details="{ replenishment_batch: { label: 'Batch' } }" />
```

`filterableDetails` can also be set in the list view config, like any other filter detail override.

### Clearing a URL Scope

Clearing the chip removes every query key the filter owns from the URL, including suffixed keys such as `created_after` and `created_before`. The list refetches without that value and returns to page 1. Visible filters, the sort, the search term, other scopes, and any other query parameters stay in place. A URL scope can always be cleared.

## Declare a Scope Backed by `params`

Application code can also narrow a list through the `params` prop. By default, `params` values are plain request parameters with no presentation. To show one as a scope, declare its key in the `scopes` prop:

```vue
<script setup>
import ViewList from "@vueda/views/ViewList.vue";
import { computed, ref } from "vue";

const props = defineProps({ selectedIds: { type: Array, default: () => [] } });
const ids = ref([...props.selectedIds]);

const params = computed(() => (ids.value.length ? { id: ids.value.join(",") } : {}));
const scopes = computed(() => ({ id: { label: `${ids.value.length} selected records` } }));

const clearScope = ({ name }) => {
    if (name === "id") {
        ids.value = [];
    }
};
</script>

<template>
    <view-list app="purchasing" model="purchaseorder" :params="params" :scopes="scopes" @clear-scope="clearScope" />
</template>
```

`scopes` is keyed by `params` key. Each entry accepts:

- `label`: the chip text. Without it, the chip shows the filter's `filterableDetails` label with its value, or with a value count when it has several. A key that is not in the list's resolved filterables shows the key itself with its value.
- `clearable`: whether the chip has a clear control. Defaults to `true`.

A declared key is shown while `params` has a value for it. When the key names a filter with suffixes, the scope owns the suffixed keys, such as `created_after` and `created_before` for `created`, and is shown while any of them has a value. Only declared keys become scopes; any other `params` key stays a plain request parameter, including one that names a hidden filter.

### When `params` Carries a Filter

If `params` carries any key of a filter, visible or hidden, `params` supplies that filter's value. This applies whether or not the key is declared in `scopes`. For a filter with suffixes, one suffixed key in `params` is enough. While `params` carries the filter:

- the add-filter menu stops offering it,
- a URL value for it stays in the URL, but the list does not send it, restore it as a filter chip, or show it as a URL scope,
- saved filter preferences neither store nor restore it.

Once the caller removes the filter's keys from `params`, the filter works as usual again. The menu offers it, and a URL value still in the URL applies again as a filter chip or a URL scope. The sort, the search term, and other filters are unaffected throughout.

### Show a Fixed Constraint

Set `clearable: false` for a constraint the reader must not remove, such as a list embedded on a record's page. The chip explains the constraint without offering a clear control:

```html
<view-list
    app="purchasing"
    model="purchaseorderline"
    :params="{ purchase_order: order.id }"
    :scopes="{ purchase_order: { label: `Order ${order.reference}`, clearable: false } }"
/>
```

### Respond to `clear-scope`

The caller owns `params`, so `ViewList` does not change it. When the reader clears a declared scope, `ViewList` emits `clear-scope` with `{ name, keys }`, where `name` is the declared key. Remove those keys from `params` in response. The updated prop removes the value from the request and the chip from the constraints band.

If the handler leaves `params` unchanged, the scope stays applied and its chip stays visible.

Once `params` no longer carries the key, a filter with that name is offered in the add-filter menu again. If the URL still has a value for that filter, the value applies, so clearing the scope does not always return the reader to the full list.

## Clear Scopes Together

With more than one clearable scope active, the scope group shows a **Clear scopes** button. It clears every URL scope in one navigation and emits one `clear-scope` event per clearable `params` scope. Scopes declared with `clearable: false` stay in place.

## Customize Scope Chips

`ViewList` passes two slots through to the scope group. Both receive the scope as `{ name, label, keys, source, clearable }`.

`scope-label` replaces a chip's label text. The chip keeps its styling and its clear control:

```html
<view-list app="purchasing" model="purchaseorder">
    <template #scope-label="{ scope }">
        <template v-if="scope.name === 'replenishment_batch'">Batch <strong>{{ batch.name }}</strong></template>
        <template v-else>{{ scope.label }}</template>
    </template>
</view-list>
```

`scope-chip` replaces a whole chip. Its `clear` slot prop asks to clear that scope, the same as the built-in clear control. It does nothing for a scope whose `clearable` is false:

```html
<view-list app="purchasing" model="purchaseorder">
    <template #scope-chip="{ scope, clear }">
        <my-badge :text="scope.label">
            <button v-if="scope.clearable" type="button" @click="clear">Show all</button>
        </my-badge>
    </template>
</view-list>
```

The Scope heading and the Clear scopes button stay in place with either slot.

## Custom List Shells

A shell built on {@api js:function:@arrai-innovations/vueda/use/useViewList#useViewList} reads the same state from its `scope` group:

- `scope.scopes` lists the active scopes as `{ name, label, keys, source, clearable }`. `source` is `"url"` for a hidden URL filter and `"params"` for a declared `params` key.
- `scope.clearUrlScopes(names)` removes the named URL scopes' query keys.

Render the chips with {@api vue:component:ScopeGroup}, hosted inside {@api vue:component:ConstraintsBar}'s `scopes` slot, and pass `scopesActive` so the band opens. `ScopeGroup` hides the clear control on a scope whose `clearable` is false. Its `clear` event carries the array of scope objects the reader asked to clear: one from a chip, or every clearable scope from Clear scopes. Pass the names of the `"url"` scopes to `scope.clearUrlScopes`, and remove the keys of the `"params"` scopes from the shell's own `params`.

## Existing Scope Banners

The `before-list` slot works as before. An application that already renders its own scope banner there, with a link back to the full list, now also gets a scope chip in the constraints band when the constraint is a hidden filter in the URL or a declared `params` key. Remove the custom banner to rely on the chip, or keep it alongside.

## Scopes Change the Request, Not Access

A scope narrows the list request. Clearing one broadens the request and nothing more. The server's permissions and row-level filtering still decide which records the reader receives, with or without the scope. Do not use a scope to hide records a reader must not see.

## Related

- [Filtering and Ordering Semantics](../core-concepts/filtering-and-ordering-semantics)
- [Configure `list`/`read`/`create`/`update` Views](./configure-crud-views)
- [Permission Model](../core-concepts/permission-model)
