<script setup>
import SortChip from "@vueda/components/SortChip.vue";
import Button from "@vueda/controls/button/Button.vue";
import "@vueda/theme/vueda-tailwind/display/SortGroup.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { parseSortField, removeSortField, toggleSortField } from "@vueda/utils/sortedFields.js";
import { computed, useSlots } from "vue";

/**
 * Renders the active sort order as a strip of removable {@api vue:component:SortChip}s,
 * plus a Clear all control. Each chip toggles its own direction; removing a chip
 * drops that field from the sort. Adding fields and reordering priority stay with
 * the {@api vue:component:SortControl} editor; this strip is the always-visible
 * read-out, the sort-side counterpart to {@api vue:component:FilterGroup}'s chips.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Active sort fields; prefix a field name with `-` for descending. */
    sorted: {
        type: Array,
        default: () => [],
    },
    /** Map of field name to field metadata (e.g. `{ label }`) used to derive human labels. */
    fieldDetails: {
        type: Object,
        default: () => ({}),
    },
    /**
     * When true, the chips render as a bare subgroup (no band chrome, no own
     * Clear all) for hosting inside a shared {@api vue:component:ConstraintsBar}.
     * When false (default), the chips render as a self-contained strip.
     */
    hosted: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits([
    /** Emitted when the active sort array changes. */
    "update:sorted",
]);

// Key each chip by its base field (a base appears at most once in a sort order),
// so toggling direction does not change the key and the chip is not recreated.
const items = computed(() => props.sorted.map((field, index) => ({ field, index, base: parseSortField(field).base })));

const toggle = (base) => emit("update:sorted", toggleSortField(props.sorted, base));
const remove = (base) => emit("update:sorted", removeSortField(props.sorted, base));
const clearAll = () => {
    if (props.sorted.length) {
        emit("update:sorted", []);
    }
};

const theme = useTheme("SortGroup", props);
const slots = useSlots();
</script>

<template>
    <div v-if="items.length" :class="hosted ? theme('subgroup') : theme('strip')" data-qa="sort-group-strip">
        <span :class="theme('eyebrow')">Sort</span>
        <sort-chip
            v-for="item in items"
            :key="item.base"
            :field="item.field"
            :index="item.index"
            :field-details="fieldDetails"
            @toggle="toggle(item.base)"
            @remove="remove(item.base)"
        >
            <template v-for="(_, slot) in slots" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps || {}" />
            </template>
        </sort-chip>
        <Button v-if="!hosted" variant="ghost" size="sm" :class="theme('clear')" data-qa="sort-clear" @click="clearAll">
            Clear all
        </Button>
    </div>
</template>
