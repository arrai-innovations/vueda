<script setup>
import { useTheme } from "@vueda/use/useTheme.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import Button from "primevue/button";
import Drawer from "primevue/drawer";
import Select from "primevue/select";
import { computed } from "vue";
import { VueDraggableNext as draggable } from "vue-draggable-next";

const props = defineProps({
    visible: {
        type: Boolean,
        default: false,
    },
    sortables: {
        type: Array,
        default: () => [],
    },
    sorted: {
        type: Array,
        default: () => [],
    },
    fieldDetails: {
        type: Object,
        default: () => ({}),
    },
});
const emit = defineEmits(["update:visible", "update:sorted"]);
const internalVisible = computed({
    get: () => props.visible,
    set: (value) => {
        emit("update:visible", value);
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
    <slot
        name="toggle-drawer-button"
        label="sort"
        size="small"
        severity="primary"
        :badge="sortedCountBadge"
        @click="internalVisible = true"
    >
        <Button
            label="Sort"
            size="small"
            severity="primary"
            :badge="sortedCountBadge"
            @click="internalVisible = true"
        />
    </slot>
    <Drawer
        v-model:visible="internalVisible"
        :modal="true"
        append-to="body"
        block-scroll
        data-qa="sort-component-drawer"
        position="bottom"
        :show-close-icon="true"
        :class="theme('drawer')"
        v-bind="$attrs"
    >
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
                            <slot name="drag-handle" :class="theme('dragHandle')" text="⋮⋮">
                                <span :class="theme('dragHandle')">⋮⋮</span>
                            </slot>
                            <span :class="theme('sortOrderText')">{{ item.index + 1 }}</span>
                            <Select
                                :model-value="item.field"
                                :options="[...availableSortableOptions, { label: item.label, value: item.field }]"
                                :class="theme('select')"
                                data-qa="sort-component-select"
                                option-label="label"
                                option-value="value"
                                @update:model-value="
                                    (value) => {
                                        const newSorted = [...props.sorted];
                                        newSorted[item.index] = value;
                                        emit('update:sorted', newSorted);
                                    }
                                "
                            >
                                <template #value="slotProps">
                                    <span v-if="slotProps.value" class="text-sm">{{ item.label }}</span>
                                    <span v-else>Select a field</span>
                                </template>
                                <template #option="slotProps">
                                    <span>{{ slotProps.option.label }}</span>
                                </template>
                            </Select>
                        </div>
                        <div :class="theme('sortInlineActionBar')">
                            <slot
                                name="toggle-order-button"
                                :label="item.descending ? '⬇️' : '⬆️'"
                                text
                                size="small"
                                @click="toggleDirection(item.index)"
                            >
                                <Button
                                    data-qa="sort-component-toggle"
                                    :label="item.descending ? '⬇️' : '⬆️'"
                                    text
                                    size="small"
                                    @click="toggleDirection(item.index)"
                                >
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
                                    label="x"
                                    data-qa="sort-component-remove"
                                    severity="danger"
                                    text
                                    size="small"
                                    @click="removeSortable(item.index)"
                                />
                            </slot>
                        </div>
                    </div>
                </draggable>
            </div>
            <div v-else class="text-sm text-surface-500">No Sorting applied. Click 'Add Sort' to begin</div>
            <div :class="theme('actionBar')">
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
                        label="Add Sort"
                        severity="secondary"
                        :disabled="!availableSortables.length"
                        size="small"
                        @click="addSortable"
                    />
                </slot>
                <slot
                    name="clear-sort-button"
                    severity="secondary"
                    text
                    label="Clear all"
                    :disabled="!props.sorted.length"
                    size="small"
                    @click="clearAll"
                >
                    <Button
                        severity="secondary"
                        text
                        label="Clear all"
                        :disabled="!props.sorted.length"
                        size="small"
                        @click="clearAll"
                    />
                </slot>
            </div>
        </div>
    </Drawer>
</template>
