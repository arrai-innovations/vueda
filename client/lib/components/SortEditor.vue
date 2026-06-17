<script setup>
import Button from "@vueda/controls/button/Button.vue";
import Select from "@vueda/controls/select/Select.vue";
import SelectContent from "@vueda/controls/select/SelectContent.vue";
import SelectItem from "@vueda/controls/select/SelectItem.vue";
import SelectTrigger from "@vueda/controls/select/SelectTrigger.vue";
import SelectValue from "@vueda/controls/select/SelectValue.vue";
import Popover from "@vueda/shell/popover/Popover.vue";
import PopoverContent from "@vueda/shell/popover/PopoverContent.vue";
import PopoverTrigger from "@vueda/shell/popover/PopoverTrigger.vue";
import { keepOpenOverNestedPopper } from "@vueda/shell/popover/keepOpenOverNestedPopper.js";
import "@vueda/theme/vueda-tailwind/display/SortEditor.theme.js";
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import { computed, ref } from "vue";
import { VueDraggableNext as draggable } from "vue-draggable-next";

/**
 * Shell-agnostic multi-field sort editor: a reorderable list of active sort
 * fields with per-row field selection and direction toggle, plus add and clear
 * actions. Hosted by a shell (the MobileSortComponent drawer today; a popover
 * shell later) that owns open/close state.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
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
    /** Emitted when the active sort array changes. */
    "update:sorted",
]);
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

// Append a sort row. The toolbar UI passes an explicit field (picked from the
// add menu); a bare call falls back to the first unused field for programmatic
// callers.
const addSortable = (field) => {
    const target = typeof field === "string" ? field : availableSortables.value[0];
    if (!target || !availableSortables.value.includes(target)) {
        return;
    }
    emit("update:sorted", [...props.sorted, target]);
};
const addMenuOpen = ref(false);
const pickAddField = (field) => {
    addSortable(field);
    addMenuOpen.value = false;
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
const theme = useTheme("SortEditor", props);
const icon = useIcons("SortEditor");
</script>
<template>
    <div :class="theme('root')">
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
                            :label="item.descending ? 'descending' : 'ascending'"
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
                                    <component
                                        :is="icon('sortDown').component"
                                        v-if="icon('sortDown')"
                                        v-bind="icon('sortDown').props"
                                        :class="{ 'rotate-180': !item.descending }"
                                        aria-hidden="true"
                                    />
                                </slot>
                            </Button>
                        </slot>
                        <!-- Button that removes a sort row; receives `label`, `text`, `index`, and a click handler as slot props. -->
                        <slot
                            name="remove-sort-button"
                            label="remove"
                            data-qa="sort-component-remove"
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
                                <component
                                    :is="icon('close').component"
                                    v-if="icon('close')"
                                    v-bind="icon('close').props"
                                    aria-hidden="true"
                                />
                            </Button>
                        </slot>
                    </div>
                </div>
            </draggable>
        </div>
        <div v-else class="text-sm text-muted-foreground">No sorting applied. Add a field to begin.</div>
        <div :class="theme('actionBar')">
            <!-- Add-sort trigger: opens a field-picker menu of unused fields. The slot is the trigger
                 (wrapped as a popover trigger); receives `label`, `disabled`, and `size` as slot props. -->
            <Popover v-model:open="addMenuOpen">
                <PopoverTrigger as-child>
                    <slot
                        name="add-sort-button"
                        data-qa="sort-component-add-button"
                        label="Add Sort"
                        :disabled="!availableSortables.length"
                        size="small"
                    >
                        <Button variant="secondary" :disabled="!availableSortables.length" size="sm"> Add Sort </Button>
                    </slot>
                </PopoverTrigger>
                <PopoverContent size="sm" data-qa="sort-add-menu" @interact-outside="keepOpenOverNestedPopper">
                    <div :class="theme('addMenuEyebrow')">Add sort</div>
                    <button
                        v-for="opt in availableSortableOptions"
                        :key="opt.value"
                        type="button"
                        :class="theme('addMenuItem')"
                        data-qa="sort-add-menu-item"
                        @click="pickAddField(opt.value)"
                    >
                        {{ opt.label }}
                    </button>
                    <div
                        v-if="!availableSortableOptions.length"
                        :class="theme('addMenuEmpty')"
                        data-qa="sort-add-menu-empty"
                    >
                        All fields sorted.
                    </div>
                </PopoverContent>
            </Popover>
            <!-- Button that clears all active sort criteria; receives `text`, `label`, `disabled`, `size`, and a click handler as slot props. -->
            <slot
                name="clear-sort-button"
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
</template>
