<script setup>
import Button from "@vueda/controls/button/Button.vue";
import Select from "@vueda/controls/select/Select.vue";
import SelectContent from "@vueda/controls/select/SelectContent.vue";
import SelectItem from "@vueda/controls/select/SelectItem.vue";
import SelectTrigger from "@vueda/controls/select/SelectTrigger.vue";
import SelectValue from "@vueda/controls/select/SelectValue.vue";
import Drawer from "@vueda/shell/drawer/Drawer.vue";
import DrawerContent from "@vueda/shell/drawer/DrawerContent.vue";
import DrawerHeader from "@vueda/shell/drawer/DrawerHeader.vue";
import DrawerTitle from "@vueda/shell/drawer/DrawerTitle.vue";
import "@vueda/theme/vueda-tailwind/display/MobileSortComponent.theme.js";
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import { computed } from "vue";
import { VueDraggableNext as draggable } from "vue-draggable-next";

/**
 * A mobile-optimized sort control that presents a bottom drawer where users can add, reorder, and remove sort fields.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
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
const icon = useIcons("MobileSortComponent");
</script>
<template>
    <!-- TODO: theme.hideStyle requires a single themed root -->
    <!-- Button that opens the sort drawer; receives `label`, `size`, `severity`, and `badge` as slot props. -->
    <slot
        name="toggle-drawer-button"
        label="sort"
        size="small"
        severity="primary"
        :badge="sortedCountBadge"
        @click="internalOpen = true"
    >
        <Button size="sm" @click="internalOpen = true">
            Sort
            <span
                v-if="sortedCountBadge"
                class="ml-1 inline-flex items-center justify-center rounded-full bg-primary-foreground text-primary text-xs size-5"
            >
                {{ sortedCountBadge }}
            </span>
        </Button>
    </slot>
    <Drawer
        v-model:open="internalOpen"
        :modal="true"
        direction="bottom"
        data-qa="sort-component-drawer"
        v-bind="$attrs"
    >
        <DrawerContent :class="theme('drawer')">
            <DrawerHeader class="sr-only">
                <DrawerTitle>Sort</DrawerTitle>
            </DrawerHeader>
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
                                <slot name="drag-handle" :class="theme('dragHandle')">
                                    <span :class="theme('dragHandle')">
                                        <component
                                            :is="icon('gripVertical').component"
                                            v-if="icon('gripVertical')"
                                            v-bind="icon('gripVertical').props"
                                            aria-hidden="true"
                                        />
                                    </span>
                                </slot>
                                <span :class="theme('sortOrderText')">{{ item.index + 1 }}</span>
                                <Select
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
                                    <SelectTrigger :class="theme('select')">
                                        <SelectValue placeholder="Select a field">
                                            <span class="text-sm">{{ item.label }}</span>
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem
                                            v-for="opt in [
                                                ...availableSortableOptions,
                                                { label: item.label, value: item.field },
                                            ]"
                                            :key="opt.value"
                                            :value="opt.value"
                                        >
                                            {{ opt.label }}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
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
                                    <Button
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
                                    </Button>
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
                                    <Button
                                        data-qa="sort-component-remove"
                                        variant="ghost"
                                        size="sm"
                                        @click="removeSortable(item.index)"
                                    >
                                        x
                                    </Button>
                                </slot>
                            </div>
                        </div>
                    </draggable>
                </div>
                <div v-else class="text-sm text-muted-foreground">No Sorting applied. Click 'Add Sort' to begin</div>
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
                        <Button
                            variant="secondary"
                            :disabled="!availableSortables.length"
                            size="sm"
                            @click="addSortable"
                        >
                            Add Sort
                        </Button>
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
                        <Button variant="ghost" :disabled="!props.sorted.length" size="sm" @click="clearAll">
                            Clear all
                        </Button>
                    </slot>
                </div>
            </div>
        </DrawerContent>
    </Drawer>
</template>
