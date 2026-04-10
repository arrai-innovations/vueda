<script setup>
import { provideCommandContext } from "./command-context.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ListboxRoot, useFilter, useForwardPropsEmits } from "reka-ui";
import { reactive, ref, watch } from "vue";

/**
 * Root of a command palette with built-in filtering, providing context to child components.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The controlled value. Can be bound with v-model. */
    modelValue: { type: [String, Number, Boolean, Object, Array], default: "" },
    /** The initial value when uncontrolled. */
    defaultValue: { type: [String, Number, Boolean, Object, Array], default: undefined },
    /** Whether multiple options can be selected. */
    multiple: { type: Boolean, default: undefined },
    /** The orientation of the listbox for arrow navigation. */
    orientation: { type: String, default: undefined },
    /** The reading direction. */
    dir: { type: String, default: undefined },
    /** When true, prevents user interaction. */
    disabled: { type: Boolean, default: undefined },
    /** How multiple selection behaves in the collection. */
    selectionBehavior: { type: String, default: undefined },
    /** When true, hovering an item triggers highlight. */
    highlightOnHover: { type: Boolean, default: undefined },
    /** Field for object comparison, or a custom comparison function. */
    by: { type: [String, Function], default: undefined },
    /** The name submitted with the form. */
    name: { type: String, default: undefined },
    /** When true, the field is required. */
    required: { type: Boolean, default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});
const emits = defineEmits(["update:modelValue", "highlight"]);

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwarded = useForwardPropsEmits(delegatedProps, emits);

const allItems = ref(new Map());
const allGroups = ref(new Map());

const { contains } = useFilter({ sensitivity: "base" });
const filterState = reactive({
    search: "",
    filtered: {
        /** The count of all visible items. */
        count: 0,
        /** Map from visible item id to its search score. */
        items: new Map(),
        /** Set of groups with at least one visible item. */
        groups: new Set(),
    },
});

function filterItems() {
    if (!filterState.search) {
        filterState.filtered.count = allItems.value.size;
        // Do nothing, each item will know to show itself because search is empty
        return;
    }

    // Reset the groups
    filterState.filtered.groups = new Set();
    let itemCount = 0;

    // Check which items should be included
    for (const [id, value] of allItems.value) {
        const score = contains(value, filterState.search);
        filterState.filtered.items.set(id, score ? 1 : 0);
        if (score) itemCount++;
    }

    // Check which groups have at least 1 item shown
    for (const [groupId, group] of allGroups.value) {
        for (const itemId of group) {
            if (filterState.filtered.items.get(itemId) > 0) {
                filterState.filtered.groups.add(groupId);
                break;
            }
        }
    }

    filterState.filtered.count = itemCount;
}

watch(
    () => filterState.search,
    () => {
        filterItems();
    },
);

provideCommandContext({
    allItems,
    allGroups,
    filterState,
});

const theme = useTheme("ControlCommand", props);
</script>

<template>
    <ListboxRoot data-slot="command" v-bind="forwarded" :class="[theme('root'), props.class]">
        <slot />
    </ListboxRoot>
</template>
