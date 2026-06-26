<script setup>
import SortChip from "@vueda/components/SortChip.vue";
import Button from "@vueda/controls/button/Button.vue";
import "@vueda/theme/vueda-tailwind/display/SortGroup.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { parseSortField, removeSortField, toggleSortField } from "@vueda/utils/sortedFields.js";
import { computed, ref, useSlots, watch } from "vue";
import { VueDraggableNext as draggable } from "vue-draggable-next";

/**
 * Renders the active sort order as a strip of removable {@api vue:component:SortChip}s,
 * plus a Clear all control (shown only with more than one chip). Each chip toggles
 * its own direction; removing a chip drops that field from the sort; dragging a
 * chip by its priority ordinal reorders the sort. Adding fields stays with the
 * {@api vue:component:SortControl} add menu; this strip is the always-visible
 * read-out and the primary editing surface, the sort-side counterpart to
 * {@api vue:component:FilterGroup}'s chips.
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

// Local working copy that the drag wrapper owns and mutates in place. Rendering
// the chips from the same array the wrapper reorders (rather than re-deriving from
// the `sorted` prop, which only updates after an async route round-trip) keeps
// sortable's DOM and Vue's vdom in lockstep; otherwise a reorder can leave them
// out of step and a later insert lands at the wrong position.
const localSorted = ref([...props.sorted]);
const sameOrder = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);
// `deep` is required: useViewList mutates `sorting.state.sorted` in place (the array
// reference is stable), so a shallow watch would never see a sort being added,
// toggled, or cleared and the chips would stay empty.
watch(
    () => props.sorted,
    (next) => {
        if (!sameOrder(next, localSorted.value)) {
            localSorted.value = [...next];
        }
    },
    { deep: true },
);

// Key each chip by its base field (a base appears at most once in a sort order),
// so toggling direction does not change the key and the chip is not recreated.
const items = computed(() =>
    localSorted.value.map((field, index) => ({ field, index, base: parseSortField(field).base })),
);

// True only while a chip is being dragged, so the strip can suppress hover/active
// styling that would otherwise track the pointer position rather than the dragged chip.
const dragging = ref(false);

// Apply optimistically to the local copy, then notify the host; the prop sync above
// stays a no-op since the orders already match.
const apply = (next) => {
    localSorted.value = next;
    emit("update:sorted", next);
};
const toggle = (base) => apply(toggleSortField(localSorted.value, base));
const remove = (base) => apply(removeSortField(localSorted.value, base));
const clearAll = () => {
    if (localSorted.value.length) {
        apply([]);
    }
};
// The drag wrapper has already mutated `localSorted` in place by the time `change`
// fires; forward the new order to the host.
const onReorder = () => emit("update:sorted", [...localSorted.value]);

const theme = useTheme("SortGroup", props);
const slots = useSlots();
</script>

<template>
    <div v-if="items.length" :class="hosted ? theme('subgroup') : theme('strip')" data-qa="sort-group-strip">
        <span :class="theme('eyebrow')">Sort</span>
        <!-- Drag-reorder the active sort. The handle is each chip's grip + ordinal
             (`.drag-handle`), which only renders with more than one chip, so a lone
             chip has nothing to grab and nothing to reorder.
             `:list` lets the wrapper splice `localSorted` in place (keeping its DOM
             and our render in sync); `force-fallback` renders sortable's own drag
             clone (instead of the browser's native drag image) so the dragged chip
             can be styled explicitly via the `.sortable-drag` / `.sortable-ghost`
             states on SortChip. -->
        <draggable
            :list="localSorted"
            :class="[theme('draggable'), dragging ? theme('dragging') : '']"
            handle=".drag-handle"
            :force-fallback="true"
            data-qa="sort-group-draggable"
            @start="dragging = true"
            @end="dragging = false"
            @change="onReorder"
        >
            <sort-chip
                v-for="item in items"
                :key="item.base"
                :field="item.field"
                :index="item.index"
                :field-details="fieldDetails"
                :show-ordinal="items.length > 1"
                @toggle="toggle(item.base)"
                @remove="remove(item.base)"
            >
                <template v-for="(_, slot) in slots" #[slot]="slotProps">
                    <slot :name="slot" v-bind="slotProps || {}" />
                </template>
            </sort-chip>
        </draggable>
        <Button
            v-if="items.length > 1"
            variant="ghost"
            size="sm"
            :class="theme('clear')"
            data-qa="sort-clear"
            @click="clearAll"
        >
            Clear all
        </Button>
    </div>
</template>
