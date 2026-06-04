<script>
import { ComboboxVirtualizer } from "reka-ui";
import { defineComponent, h } from "vue";

/**
 * Virtualizes the list of items inside ComboboxViewport for large datasets.
 * Requires manual filtering of options before passing them in.
 *
 * Uses a render function (not a template) to pass slots directly to reka-ui's
 * ComboboxVirtualizer without adding an extra renderSlot Fragment layer. A
 * template-based wrapper would produce two nested Fragments, causing
 * ListboxVirtualizer's depth-1 VNode search to return undefined and crash.
 */
export default defineComponent({
    name: "ComboboxVirtualizer",
    props: {
        /** List of items to render. */
        options: { type: Array, required: true },
        /** Estimated size (in px) of each item. */
        estimateSize: { type: [Number, Function], default: undefined },
        /** Number of items rendered outside the visible area. */
        overscan: { type: Number, default: undefined },
        /** Text content for each item to achieve type-ahead feature. */
        textContent: { type: Function, default: undefined },
    },
    setup(props, { slots }) {
        return () => h(ComboboxVirtualizer, props, slots);
    },
});
</script>
