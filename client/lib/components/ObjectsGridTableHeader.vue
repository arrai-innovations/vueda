<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed, reactive } from "vue";

const props = defineProps({
    field: {
        type: Object,
        required: true,
        description: "The field definition, we use name and label",
    },
    columnIndex: {
        type: Number,
        required: true,
    },
    columnCount: {
        type: Number,
        required: true,
    },
    sortable: {
        type: Boolean,
        default: false,
    },
    ascending: {
        type: Boolean,
        default: false,
    },
    descending: {
        type: Boolean,
        default: false,
    },
    multiSortIndex: {
        type: Number,
        default: undefined,
    },
    fieldProps: {
        type: Object,
        default: () => ({}),
        description: "Props to pass to the field slots",
    },
    ...THEME_OVERRIDE_PROPS,
});

const themeContext = reactive({
    props,
});
const theme = useTheme("ObjectsGridTableHeader", props, themeContext);
const uniqueKeyForSlot = computed(() =>
    props.field.name ? `${props.field.name}-${props.columnIndex}` : `col-${props.columnIndex}`,
);
</script>
<template>
    <div :class="theme('root')" data-qa="objects-grid-table-header-root">
        <span :class="theme('label')" data-qa="objects-grid-table-header-label">
            <slot
                :key="uniqueKeyForSlot"
                :column-index="columnIndex"
                :column-count="columnCount"
                :field="field"
                v-bind="fieldProps"
                gird-type="table-header"
                :is-table-layout="true"
                :is-card-layout="false"
                name="label"
            >
                {{ field.label }}
            </slot>
        </span>
        <span v-if="sortable" :class="theme('sortIcon')" data-qa="objects-grid-table-header-sort-icon">
            <slot
                :key="uniqueKeyForSlot"
                :ascending="ascending"
                :column-index="columnIndex"
                :column-count="columnCount"
                :descending="descending"
                :field="field"
                :is-table-layout="true"
                :is-card-layout="false"
                name="sort-icon"
                v-bind="fieldProps"
            >
                <!-- iconless text, screams to implementors to provide an icon -->
                <template v-if="ascending">⬆️</template>
                <template v-else-if="descending">⬇️</template>
                <template v-else>↕️</template>
            </slot>
            <span
                v-if="multiSortIndex !== -1"
                :class="theme('multiSortNumber')"
                data-qa="objects-grid-table-header-multi-sort-number"
            >
                {{ multiSortIndex + 1 }}
            </span>
        </span>
    </div>
</template>
