---
title: Open a Scoped List
type: how-to
audience: integrator
status: draft
---

# Open a Scoped List

A {@term List Scope} narrows a list to records that a link or your application code chose, such as the purchase orders that one action just created. {@api vue:component:ViewList} shows each active scope as a labeled chip in the constraints band, next to the filter and sort chips. A clearable chip has a clear control that returns the user to the unscoped list.

A scope comes from one of two sources:

- **A hidden filter in the URL.** The server declares a filter with a hidden widget, and a link supplies its value as a query parameter.
- **A declared `params` key.** Your code passes the value through the [`params`]{@api vue:component:ViewList:prop:params} prop and declares the key in the [`scopes`]{@api vue:component:ViewList:prop:scopes} prop.

This guide assumes a working CRUD surface (see [Create a CRUD Surface](./create-crud-surface)).

## Scope a List Through the URL

### Declare a Hidden Filter

On the viewset's filterset, declare the filter with Django's [`HiddenInput`]{@api ext:django:django.forms.HiddenInput} widget:

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

The widget alone decides whether a filter is hidden. {@term Model Info} reports [`hidden: true`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#FilterInfo.hidden} for any filter whose widget is hidden, whatever the filter's type. A hidden filter:

- never appears in the add-filter menu,
- never becomes an editable filter chip,
- needs no client input mapping for its type, so a hidden [`UUIDFilter`]{@api ext:django-filter:django_filters.filters.UUIDFilter} works without a registered UUID input.

{@api py:class:vueda.core.filters.VuedaFilterSet} inherits a hidden `id` filter from {@api py:class:vueda.core.filters.IdInFilterSet}, so an `?id=1,2` link scopes any list to those records. A composite-key filterset has no `id` filter (see [Set Up CRUD for a Composite Primary Key Model](./composite-primary-keys)).

The server validates a hidden filter's value like any other filter value. [Filtering and Ordering Semantics](../core-concepts/filtering-and-ordering-semantics#query-namespace-and-validation-boundary) describes that validation and how the server rejects a bad query.

### Link to the Scoped List

Put the filter's value in a query parameter on the list route:

```text
/purchasing/purchaseorder/list/?replenishment_batch=3f2a9c1e-8b7d-4e21-9a55-0c1d2e3f4a5b
```

From application code, build the same location with {@api js:function:@arrai-innovations/vueda/router/getCrud#getCRUDForTo}:

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

`ViewList` sends the value with every list request. When the user changes visible filters, the sort, or the search term, the value stays in the URL and in the request. Navigation that changes the value returns the list to page 1. Examples are a link to another batch or the browser's back button.

Scope chips appear once the list's model metadata has loaded, because their labels and keys come from that metadata. The first list request waits for the same metadata, so the chips and the scoped rows arrive together.

### Keep the Filter in an Overridden `filterables` List

`ViewList` recognizes a hidden filter only when the filter is in its resolved filterable list. That list comes from the server's filtering metadata unless you override it through the [`filterables`]{@api vue:component:ViewList:prop:filterables} prop or the {@term Model Config}. When you override it, include the hidden filter:

```html
<view-list app="purchasing" model="purchaseorder" :filterables="['supplier', 'status', 'replenishment_batch']" />
```

If the override leaves the hidden filter out, `ViewList` shows no scope for it and does not send its URL value.

### Label the Scope

The chip label is the filter's [`label`]{@api js:property:@arrai-innovations/vueda/stores/storeModelInfo#FilterInfo.label} followed by the value, such as `Replenishment Batch · 3f2a9c1e-8b7d-4e21-9a55-0c1d2e3f4a5b`. When the value has several parts, the chip shows a count. Examples are an `in` lookup's comma-separated list and a range filter's suffixed keys. For the built-in `id` filter, whose server label is `Id Is In`, an `?id=1,2` link shows `Id Is In · 2 values`. A label too long for the constraints band is cut off with an ellipsis, and hovering the chip shows the full text.

To change the text, override the filter's `label` through the [`filterableDetails`]{@api vue:component:ViewList:prop:filterableDetails} prop. A hidden filter has no input, so its label appears only on the scope chip and in filter error messages:

```html
<view-list app="purchasing" model="purchaseorder" :filterable-details="{ replenishment_batch: { label: 'Batch' } }" />
```

You can also set `filterableDetails` in the model config for the list view, like any other filter detail override.

### Clear a URL Scope

When the user clears the chip, `ViewList` removes every query key that the filter owns from the URL. That includes suffixed keys such as `created_after` and `created_before`. The list refetches without the value and returns to page 1. Visible filters, the sort, the search term, other scopes, and other query parameters stay in place. A URL scope always has a clear control.

## Declare a Scope Backed by `params`

Your code can also narrow a list through the `params` prop. A `params` value is a plain request parameter unless you declare its key in the `scopes` prop, which shows it as a scope:

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

- [`label`]{@api js:property:@arrai-innovations/vueda/use/useViewList#ViewListScopeDeclaration.label}: the chip text. Without it, the chip uses the filter's label with the value. When there are several values, the chip uses the label with a value count. For a key that is not in the resolved filterables, the chip uses the key itself with the value.
- [`clearable`]{@api js:property:@arrai-innovations/vueda/use/useViewList#ViewListScopeDeclaration.clearable}: whether the chip has a clear control. Defaults to `true`.

The chip for a declared scope appears while `params` has a value for its key. When the key is the name of a filter with suffixes, the scope owns the suffixed keys too, such as `created_after` and `created_before` for `created`. The chip appears while any of them has a value. Only declared keys become scopes. Every other `params` key stays a plain request parameter, including a key that names a hidden filter.

### When `params` Carries a Filter

If `params` carries any key of a filter, visible or hidden, `params` supplies that filter's value. This holds whether or not `scopes` declares the key. For a filter with suffixes, one suffixed key in `params` is enough. While `params` carries the filter:

- the add-filter menu does not offer it,
- a URL value for it stays in the URL, but the list does not send it, restore it as a filter chip, or show it as a URL scope,
- saved list preferences do not store or restore it. [Configure `list`/`read`/`create`/`update` Views](./configure-crud-views#list-preferences) describes list preferences.

When your code removes the filter's keys from `params`, the filter behaves as usual again. The menu offers it, and a URL value still in the URL applies again as a filter chip or a URL scope. The sort, the search term, and other filters are unaffected throughout.

### Show a Fixed Constraint

Set `clearable: false` for a constraint that the user must not remove, such as the parent record of a list embedded on that record's page. The chip describes the constraint and has no clear control:

```html
<view-list
    app="purchasing"
    model="purchaseorderline"
    :params="{ purchase_order: order.id }"
    :scopes="{ purchase_order: { label: `Order ${order.reference}`, clearable: false } }"
/>
```

### Respond to `clear-scope`

`ViewList` does not change `params`, because your code supplies it. When the user clears a declared scope, `ViewList` emits [`clear-scope`]{@api vue:component:ViewList:event:clear-scope} with `{ name, keys }`, where `name` is the declared key. Remove those keys from `params` in the handler. The updated prop removes the value from the request and the chip from the constraints band, and the list returns to page 1.

Any change to the content of `params` returns the list to page 1. Passing an equal `params` object again keeps the current page. If the handler leaves `params` unchanged, the scope stays applied and its chip stays visible.

Once `params` no longer carries the key, the add-filter menu offers a filter with that name again. If the URL still has a value for that filter, the value applies. So clearing the scope does not always return the user to the unscoped list.

## Clear Scopes Together

When more than one clearable scope is active, the scope group shows a **Clear scopes** button. It clears every URL scope in one navigation and emits one `clear-scope` event per clearable `params` scope. Scopes declared with `clearable: false` stay in place.

## Customize Scope Chips

`ViewList` passes the {@api vue:component:ScopeGroup} slots through. Both slots receive the scope as `{ name, label, keys, source, clearable }`, the fields of {@api js:interface:@arrai-innovations/vueda/use/useViewList#ViewListScope}.

[`scope-label`]{@api vue:component:ScopeGroup:slot:scope-label} replaces a chip's label text. The chip keeps its styling and its clear control:

```html
<view-list app="purchasing" model="purchaseorder">
    <template #scope-label="{ scope }">
        <template v-if="scope.name === 'replenishment_batch'">Batch <strong>{{ batch.name }}</strong></template>
        <template v-else>{{ scope.label }}</template>
    </template>
</view-list>
```

[`scope-chip`]{@api vue:component:ScopeGroup:slot:scope-chip} replaces a whole chip. Its `clear` slot prop asks to clear that scope, the same as the built-in clear control. It does nothing for a scope whose `clearable` is false:

```html
<view-list app="purchasing" model="purchaseorder">
    <template #scope-chip="{ scope, clear }">
        <my-badge :text="scope.label">
            <button v-if="scope.clearable" type="button" @click="clear">Show all</button>
        </my-badge>
    </template>
</view-list>
```

With either slot, the group keeps its Scope heading and its Clear scopes button.

## Build Scopes into a Custom List Shell

A shell built on {@api js:function:@arrai-innovations/vueda/use/useViewList#useViewList} reads the same state from its [`scope`]{@api js:property:@arrai-innovations/vueda/use/useViewList#ViewListContext.scope} group:

- [`scope.scopes`]{@api js:property:@arrai-innovations/vueda/use/useViewList#ViewListScopeGroup.scopes} lists the active scopes. Each scope's `source` is `"url"` for a hidden URL filter and `"params"` for a declared `params` key.
- [`scope.clearUrlScopes(names)`]{@api js:property:@arrai-innovations/vueda/use/useViewList#ViewListScopeGroup.clearUrlScopes} removes the named URL scopes' query keys.

To render the chips:

1. Put `ScopeGroup` in the [`scopes`]{@api vue:component:ConstraintsBar:slot:scopes} slot of {@api vue:component:ConstraintsBar}.
2. Pass [`scopesActive`]{@api vue:component:ConstraintsBar:prop:scopesActive} so the band opens.
3. Handle the `ScopeGroup` [`clear`]{@api vue:component:ScopeGroup:event:clear} event. It carries an array of the scopes that the user asked to clear: one from a chip, or every clearable scope from Clear scopes.
4. Pass the names of the `"url"` scopes to `scope.clearUrlScopes`, and remove the keys of the `"params"` scopes from the shell's own `params`.

`ScopeGroup` hides the clear control on a scope whose `clearable` is false.

## Keep an Existing Scope Banner

Your application may already render its own scope banner in the [`before-list`]{@api vue:component:ViewList:slot:before-list} slot. The list also shows a scope chip for a hidden URL filter or a declared `params` key. Remove the banner to rely on the chip, or keep both.

## Scopes and Access

A scope narrows the list request, and clearing it broadens the request. The server's permissions and row-level filtering decide which records the user receives, with or without a scope. Do not use a scope to hide records that a user must not see. [Authorization vs UI Semantics](../core-concepts/authorization-vs-ui-semantics) describes where the server enforces access.

## Related

- [Filtering and Ordering Semantics](../core-concepts/filtering-and-ordering-semantics)
- [Configure `list`/`read`/`create`/`update` Views](./configure-crud-views)
- [Permission Model](../core-concepts/permission-model)
