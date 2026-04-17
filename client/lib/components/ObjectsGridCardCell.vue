<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import { useObjectGridCell } from "@vueda/use/useObjectGridCell.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed, reactive, toRef } from "vue";

/**
 * Renders a single field as a label/value pair in the card-layout view of ObjectsGrid.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    /** Field definition object; `name`, `label`, `value`, and `formatted` properties are used by this component. */
    field: {
        type: Object,
        required: true,
        description: "The field definition, we use name, label, value, and formatted",
    },
    /** The raw data object for the current row. */
    obj: {
        type: Object,
        required: true,
    },
    /** Related (joined) object data for the current row. */
    relatedObject: {
        type: Object,
        required: true,
    },
    /** Pre-calculated derived values for the current row. */
    calculatedObject: {
        type: Object,
        required: true,
    },
    /** Zero-based index of the current row. */
    rowIndex: {
        type: Number,
        required: true,
    },
    /** Zero-based index of the current column. */
    columnIndex: {
        type: Number,
        required: true,
    },
    /** Total number of rows in the grid. */
    rowCount: {
        type: Number,
        required: true,
    },
    /** Total number of columns in the grid. */
    columnCount: {
        type: Number,
        required: true,
    },
    /** Additional props forwarded to the `value` slot. */
    fieldProps: {
        type: Object,
        default: () => ({}),
        description: "Props to pass to the field slots",
    },
    /** Name of the primary key property on `obj`. */
    pkKey: {
        type: String,
        default: "id",
    },
    /** Primary key value of the current row's object. */
    pk: {
        type: [String, Number],
        default: undefined,
    },
    /** Additional CSS class applied to the field label header element. */
    headerClass: {
        type: String,
        default: "",
    },
    ...THEME_OVERRIDE_PROPS,
});

const themeContext = reactive({
    props,
});
const theme = useTheme("ObjectsGridCardCell", props, themeContext);
const { formattedComputed, valueComputed } = useObjectGridCell(props);
const uniqueKeyForSlot = computed(() =>
    props.field.name && props.obj?.[props.pkKey]
        ? `${props.field.name}-${props.obj?.[props.pkKey]}`
        : `col-${props.columnIndex}-row-${props.rowIndex}`,
);
const effectiveHeaderClass = combineClasses(theme("header"), toRef(props, "headerClass"));
</script>
<template>
    <!-- Field label header; receives `class`, `rowIndex`, `columnIndex`, `rowCount`, `columnCount`, `field`, `isTableLayout`, `isCardLayout`, and `dataCardHeader` as slot props. -->
    <slot
        :key="uniqueKeyForSlot"
        :class="effectiveHeaderClass"
        :row-index="rowIndex"
        :column-index="columnIndex"
        :row-count="rowCount"
        :column-count="columnCount"
        :field="field"
        gird-type="cell"
        :is-table-layout="false"
        :is-card-layout="true"
        :data-card-header="field.name"
        name="header"
    >
        <div :class="effectiveHeaderClass" :data-card-header="field.name">
            {{ field.label }}
        </div>
    </slot>
    <div :class="theme('value')" v-bind="$attrs" :data-card="field.name">
        <!-- Cell value content; receives `calculatedObj`, `columnIndex`, `field`, `formatted`, `isTableLayout`, `isCardLayout`, `obj`, `pk`, `pkKey`, `relatedObj`, `rowIndex`, `rowCount`, `columnCount`, `value`, and any `fieldProps` as slot props. -->
        <slot
            :key="uniqueKeyForSlot"
            :calculated-obj="calculatedObject"
            :column-index="columnIndex"
            :field="field"
            :formatted="formattedComputed"
            :is-table-layout="false"
            :is-card-layout="true"
            name="value"
            :obj="obj"
            :pk="obj?.[pkKey]"
            :pk-key="pkKey"
            :related-obj="relatedObject"
            :row-index="rowIndex"
            :row-count="rowCount"
            :column-count="columnCount"
            :value="valueComputed"
            v-bind="fieldProps"
            >{{ formattedComputed }}</slot
        >
    </div>
</template>
