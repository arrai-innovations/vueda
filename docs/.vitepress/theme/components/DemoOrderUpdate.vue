<script setup>
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import ViewUpdate from "@vueda/views/ViewUpdate.vue";
import { defineComponent, h, inject } from "vue";

/**
 * Docs-only wrapper that renders a live ViewUpdate with an order summary in the
 * `after-fields` slot.
 *
 * ModelDemo mounts the target view as the sub-app root and can only pass props,
 * so demos that need view slots use a wrapper component.
 *
 * The summary reads `unit_price` and `total` from the form context. Both arrive in the
 * fetched object and refresh after each save, but `submitFields` leaves them out of
 * every request body.
 */
defineProps({
    /** Django app label. */
    app: { type: String, required: true },
    /** Model name. */
    model: { type: String, required: true },
    /** Primary key of the order. */
    pk: { type: [String, Number], required: true },
});

// Defined inline because the slot content renders below ViewUpdate, which provides the form context.
const OrderSummary = defineComponent({
    name: "OrderSummary",
    setup() {
        const formContext = inject(FormContextSymbol);
        return () => {
            const values = formContext?.state.values ?? {};
            return h(
                "dl",
                { class: "mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm", "data-qa": "order-summary" },
                [
                    h("dt", { class: "text-muted-foreground" }, "Unit price"),
                    h("dd", { class: "tabular-nums" }, values.unit_price ?? ""),
                    h("dt", { class: "text-muted-foreground" }, "Total"),
                    h("dd", { class: "tabular-nums font-semibold" }, values.total ?? ""),
                ],
            );
        };
    },
});
</script>

<template>
    <ViewUpdate :app="app" :model="model" :pk="String(pk)">
        <template #after-fields>
            <OrderSummary />
        </template>
    </ViewUpdate>
</template>
