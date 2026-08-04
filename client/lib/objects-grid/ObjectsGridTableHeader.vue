<script setup>
import "@vueda/theme/vueda-tailwind/objects-grid/ObjectsGridTableHeader.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed, reactive } from "vue";

/**
 * Renders a column header cell in the table-layout view of ObjectsGrid, showing the field label.
 */
defineOptions({});

const props = defineProps({
    /** Field definition object; `name` and `label` properties are used by this component. */
    field: {
        type: Object,
        required: true,
        description: "The field definition, we use name and label",
    },
    /** Zero-based index of this column. */
    columnIndex: {
        type: Number,
        required: true,
    },
    /** Total number of columns in the grid. */
    columnCount: {
        type: Number,
        required: true,
    },
    /** Additional props forwarded to the `label` slot. */
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
    <div :class="theme('root')" :style="theme.hideStyle?.value" data-qa="objects-grid-table-header-root">
        <span :class="theme('label')" data-qa="objects-grid-table-header-label">
            <!-- Column label content; receives `columnIndex`, `columnCount`, `field`, `isTableLayout`, `isCardLayout`, and any `fieldProps` as slot props. -->
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
    </div>
</template>
