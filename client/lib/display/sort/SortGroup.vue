<script setup>
import Button from "@vueda/controls/button/Button.vue";
import SortChip from "@vueda/display/sort/SortChip.vue";
import "@vueda/theme/vueda-tailwind/display/SortGroup.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { parseSortField, removeSortField, toggleSortField } from "@vueda/utils/sortedFields.js";
import { computed, ref, useSlots, watch } from "vue";
import { VueDraggableNext as draggable } from "vue-draggable-next";

/**
 * Renders the active sort order as a strip of removable {@api vue:component:SortChip}s,
 * plus a Reset sort control (shown only when the active sort differs from `defaultSorted`).
 * Each chip toggles its own direction; removing a chip drops that field from the sort
 * (the remove control itself is hidden once only one chip remains, since there is
 * nothing left to remove down to); dragging a chip by its priority ordinal reorders
 * the sort. Adding fields stays with the {@api vue:component:SortControl} add menu;
 * this strip is the always-visible read-out and the primary editing surface, the
 * sort-side counterpart to {@api vue:component:FilterGroup}'s chips.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Active sort fields; prefix a field name with `-` for descending. */
    sorted: {
        type: Array,
        default: () => [],
    },
    /**
     * The server's default sort order, in the same `-`-prefixed representation as `sorted`.
     * Read only to decide whether Reset sort has anything to do: the control is hidden whenever
     * `sorted` already matches it. Reset itself emits an empty `update:sorted` rather than this
     * array, leaving the host to resolve what "the default" means — see the `update:sorted` event.
     */
    defaultSorted: {
        type: Array,
        default: () => [],
    },
    /** Map of field name to field metadata (e.g. `{ label }`) used to derive human labels. */
    fieldDetails: {
        type: Object,
        default: () => ({}),
    },
    /**
     * When true, the chips render as a bare subgroup (no band chrome) for
     * hosting inside a shared {@api vue:component:ConstraintsBar}; the group
     * keeps its own Reset sort control. When false (default), the chips render
     * as a self-contained strip.
     */
    hosted: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits([
    /**
     * Emitted when the active sort array changes. Reset sort emits an empty array, which the host
     * reads as "use the default" rather than as "sort by nothing" — a list with no `o` param is one
     * the server sorts by its own default anyway.
     * {@api js:function:@arrai-innovations/vueda/use/useViewList#useViewList} answers it by
     * clearing the stored sort preference and applying `defaultSorted`; a host that just assigns
     * what it receives clears the sort instead. Emitting `defaultSorted` here would say the opposite:
     * `useViewList` would store it as an explicit preference, which is the one thing a default is not.
     */
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
// Hidden once the active sort already matches the default, since there is nothing to reset.
const matchesDefault = computed(() => sameOrder(localSorted.value, props.defaultSorted));
// Emits an empty sort, not `defaultSorted`: the host is what turns that into the default (see the
// `update:sorted` event). `localSorted` is emptied along with it and the chips disappear until the
// host echoes the default back through `sorted`, which is the same optimistic round-trip every
// other edit here makes.
const resetToDefault = () => {
    if (!matchesDefault.value) {
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
    <!-- Renders with no active chips when the sort has been cleared down to nothing
         but still differs from the default, so Reset sort stays reachable. -->
    <div
        v-if="items.length || !matchesDefault"
        :class="hosted ? theme('subgroup') : theme('strip')"
        data-qa="sort-group-strip"
    >
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
                :removable="items.length > 1"
                @toggle="toggle(item.base)"
                @remove="remove(item.base)"
            >
                <template v-for="(_, slot) in slots" #[slot]="slotProps">
                    <slot :name="slot" v-bind="slotProps || {}" />
                </template>
            </sort-chip>
        </draggable>
        <Button
            v-if="!matchesDefault"
            emphasis="ghost"
            size="sm"
            :class="theme('clear')"
            data-qa="sort-reset"
            @click="resetToDefault"
        >
            Reset sort
        </Button>
    </div>
</template>
