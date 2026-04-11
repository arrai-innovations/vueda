<script setup>
import ControlButton from "@vueda/controls/button/ControlButton.vue";
import ControlSelect from "@vueda/controls/select/ControlSelect.vue";
import ControlSelectContent from "@vueda/controls/select/ControlSelectContent.vue";
import ControlSelectItem from "@vueda/controls/select/ControlSelectItem.vue";
import ControlSelectTrigger from "@vueda/controls/select/ControlSelectTrigger.vue";
import ControlSelectValue from "@vueda/controls/select/ControlSelectValue.vue";
import ShellDrawer from "@vueda/shell/drawer/ShellDrawer.vue";
import ShellDrawerContent from "@vueda/shell/drawer/ShellDrawerContent.vue";
import ShellDrawerHeader from "@vueda/shell/drawer/ShellDrawerHeader.vue";
import ShellDrawerTitle from "@vueda/shell/drawer/ShellDrawerTitle.vue";
import { useTheme } from "@vueda/use/useTheme.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import { computed } from "vue";
import { VueDraggableNext as draggable } from "vue-draggable-next";

/**
 * A mobile-optimized sort control that presents a bottom drawer where users can add, reorder, and remove sort fields.
 */
defineOptions({});

const props = defineProps({
    /** Whether the sort drawer is open. */
    open: {
        type: Boolean,
        default: false,
    },
    /** Array of field names that can be added as sort criteria. */
    sortables: {
        type: Array,
        default: () => [],
    },
    /** Currently active sort fields; prefix a field name with `-` to indicate descending order. */
    sorted: {
        type: Array,
        default: () => [],
    },
    /** Map of field name to field metadata (e.g. `{ label }`) used to derive human-readable labels. */
    fieldDetails: {
        type: Object,
        default: () => ({}),
    },
});
const emit = defineEmits([
    /** Emitted when the drawer open/close state changes. */
    "update:open",
    /** Emitted when the active sort array changes. */
    "update:sorted",
]);
const internalOpen = computed({
    get: () => props.open,
    set: (value) => {
        emit("update:open", value);
    },
});
const fieldLabel = (field) => props.fieldDetails?.[field]?.label || memoizedStartCase(field);
const computedSorted = computed(() =>
    props.sorted.map((field, index) => {
        const base = field?.replace(/^-/, "") || "";
        const descending = field?.startsWith("-");

        return { index, field, base, descending, label: fieldLabel(base) };
    }),
);
const availableSortables = computed(() =>
    props.sortables.filter((sortable) => !computedSorted.value.map((item) => item.base).includes(sortable)),
);
const availableSortableOptions = computed(() => {
    return availableSortables.value.map((field) => ({
        label: fieldLabel(field),
        value: field,
    }));
});

const addSortable = () => {
    if (!availableSortables.value.length) {
        return;
    }
    const newSorted = [...props.sorted, availableSortables.value[0]];
    emit("update:sorted", newSorted);
};
const clearAll = () => {
    if (!props.sorted.length) {
        return;
    }
    emit("update:sorted", []);
};
const removeSortable = (index) => {
    const newSorted = props.sorted.filter((_, idx) => idx !== index);
    emit("update:sorted", newSorted);
};
const toggleDirection = (index) => {
    const current = computedSorted.value[index];
    if (!current) {
        return;
    }
    const updated = [...props.sorted];
    updated[index] = current.descending ? current.base : `-${current.base}`;
    emit("update:sorted", updated);
};
const sortedCount = computed(() => props.sorted.length);
const sortedCountBadge = computed(() => (sortedCount.value ? String(sortedCount.value) : undefined));
const theme = useTheme("MobileSortComponent", props);
</script>
<template>
    <!-- Button that opens the sort drawer; receives `label`, `size`, `severity`, and `badge` as slot props. -->
    <slot
        name="toggle-drawer-button"
        label="sort"
        size="small"
        severity="primary"
        :badge="sortedCountBadge"
        @click="internalOpen = true"
    >
        <ControlButton size="sm" @click="internalOpen = true">
            Sort
            <span
                v-if="sortedCountBadge"
                class="ml-1 inline-flex items-center justify-center rounded-full bg-primary-foreground text-primary text-xs size-5"
            >
                {{ sortedCountBadge }}
            </span>
        </ControlButton>
    </slot>
    <ShellDrawer
        v-model:open="internalOpen"
        :modal="true"
        direction="bottom"
        data-qa="sort-component-drawer"
        v-bind="$attrs"
    >
        <ShellDrawerContent :class="theme('drawer')">
            <ShellDrawerHeader class="sr-only">
                <ShellDrawerTitle>Sort</ShellDrawerTitle>
            </ShellDrawerHeader>
            <div :class="theme('drawerInner')">
                <span>Drag to reorder. First sort has highest priority</span>
                <div v-if="computedSorted.length">
                    <draggable
                        :model-value="props.sorted"
                        :class="theme('draggable')"
                        handle=".drag-handle"
                        @update:model-value="emit('update:sorted', $event)"
                    >
                        <div v-for="item in computedSorted" :key="item.field" :class="theme('draggableItem')">
                            <div :class="theme('draggableItemInner')">
                                <!-- Drag handle shown for each sort row; receives `class` and `text` as slot props. -->
                                <slot name="drag-handle" :class="theme('dragHandle')" text="⋮⋮">
                                    <span :class="theme('dragHandle')">⋮⋮</span>
                                </slot>
                                <span :class="theme('sortOrderText')">{{ item.index + 1 }}</span>
                                <ControlSelect
                                    :model-value="item.field"
                                    data-qa="sort-component-select"
                                    @update:model-value="
                                        (value) => {
                                            const newSorted = [...props.sorted];
                                            newSorted[item.index] = value;
                                            emit('update:sorted', newSorted);
                                        }
                                    "
                                >
                                    <ControlSelectTrigger :class="theme('select')">
                                        <ControlSelectValue placeholder="Select a field">
                                            <span class="text-sm">{{ item.label }}</span>
                                        </ControlSelectValue>
                                    </ControlSelectTrigger>
                                    <ControlSelectContent>
                                        <ControlSelectItem
                                            v-for="opt in [
                                                ...availableSortableOptions,
                                                { label: item.label, value: item.field },
                                            ]"
                                            :key="opt.value"
                                            :value="opt.value"
                                        >
                                            {{ opt.label }}
                                        </ControlSelectItem>
                                    </ControlSelectContent>
                                </ControlSelect>
                            </div>
                            <div :class="theme('sortInlineActionBar')">
                                <!-- Button that toggles sort direction for a row; receives `label`, `text`, `size`, and a click handler as slot props. -->
                                <slot
                                    name="toggle-order-button"
                                    :label="item.descending ? '⬇️' : '⬆️'"
                                    text
                                    size="small"
                                    @click="toggleDirection(item.index)"
                                >
                                    <ControlButton
                                        data-qa="sort-component-toggle"
                                        variant="ghost"
                                        size="sm"
                                        @click="toggleDirection(item.index)"
                                    >
                                        <!-- Icon rendered inside the toggle-order button; receives `field`, `sorted`, `index`, `descending`, and `ascending` as slot props. -->
                                        <slot
                                            name="sort-icon"
                                            :field="item.field"
                                            :sorted="props.sorted"
                                            :index="item.index"
                                            :descending="item.descending"
                                            :ascending="!item.descending"
                                        >
                                            <template v-if="item.descending">⬇️</template>
                                            <template v-else>⬆️</template>
                                        </slot>
                                    </ControlButton>
                                </slot>
                                <!-- Button that removes a sort row; receives `label`, `severity`, `text`, `index`, and a click handler as slot props. -->
                                <slot
                                    name="remove-sort-button"
                                    label="x"
                                    data-qa="sort-component-remove"
                                    severity="danger"
                                    text
                                    :index="item.index"
                                    @click="removeSortable(item.index)"
                                >
                                    <ControlButton
                                        data-qa="sort-component-remove"
                                        variant="ghost"
                                        size="sm"
                                        @click="removeSortable(item.index)"
                                    >
                                        x
                                    </ControlButton>
                                </slot>
                            </div>
                        </div>
                    </draggable>
                </div>
                <div v-else class="text-sm text-neutral-500">No Sorting applied. Click 'Add Sort' to begin</div>
                <div :class="theme('actionBar')">
                    <!-- Button that appends the first available field as a new sort criterion; receives `label`, `severity`, `disabled`, `size`, and a click handler as slot props. -->
                    <slot
                        name="add-sort-button"
                        data-qa="sort-component-add-button"
                        label="Add Sort"
                        severity="secondary"
                        :disabled="!availableSortables.length"
                        size="small"
                        @click="addSortable"
                    >
                        <ControlButton
                            variant="secondary"
                            :disabled="!availableSortables.length"
                            size="sm"
                            @click="addSortable"
                        >
                            Add Sort
                        </ControlButton>
                    </slot>
                    <!-- Button that clears all active sort criteria; receives `severity`, `text`, `label`, `disabled`, `size`, and a click handler as slot props. -->
                    <slot
                        name="clear-sort-button"
                        severity="secondary"
                        text
                        label="Clear all"
                        :disabled="!props.sorted.length"
                        size="small"
                        @click="clearAll"
                    >
                        <ControlButton variant="ghost" :disabled="!props.sorted.length" size="sm" @click="clearAll">
                            Clear all
                        </ControlButton>
                    </slot>
                </div>
            </div>
        </ShellDrawerContent>
    </ShellDrawer>
</template>
