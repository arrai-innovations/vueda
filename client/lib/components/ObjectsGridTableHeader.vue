<script setup>
import "@vueda/theme/vueda-tailwind/objects-grid/ObjectsGridTableHeader.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed, reactive } from "vue";

/**
 * Renders a column header cell in the table-layout view of ObjectsGrid, showing the field label and an optional sort direction indicator.
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
    /** Whether this column can be sorted by clicking the header. */
    sortable: {
        type: Boolean,
        default: false,
    },
    /** Whether the current sort order for this column is ascending. */
    ascending: {
        type: Boolean,
        default: false,
    },
    /** Whether the current sort order for this column is descending. */
    descending: {
        type: Boolean,
        default: false,
    },
    /** Zero-based sort priority index when multiple columns are sorted simultaneously; `-1` means not part of a multi-sort. */
    multiSortIndex: {
        type: Number,
        default: undefined,
    },
    /** Additional props forwarded to the `label` and `sort-icon` slots. */
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
        <span v-if="sortable" :class="theme('sortIcon')" data-qa="objects-grid-table-header-sort-icon">
            <!-- Sort direction icon; receives `ascending`, `columnIndex`, `columnCount`, `descending`, `field`, `isTableLayout`, `isCardLayout`, and any `fieldProps` as slot props. -->
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
                <!-- iconless text, screams to integrators to provide an icon -->
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
