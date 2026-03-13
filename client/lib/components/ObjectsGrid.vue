<script setup>
import { combineClasses, keyDiff } from "@arrai-innovations/reactive-helpers";
import EmptyComponent from "@vueda/components/EmptyComponent.vue";
import ObjectsGridBodyCell from "@vueda/components/ObjectsGridBodyCell.vue";
import ObjectsGridBodyCellSkeleton from "@vueda/components/ObjectsGridBodyCellSkeleton.vue";
import ObjectsGridCardCell from "@vueda/components/ObjectsGridCardCell.vue";
import ObjectsGridCardCellSkeleton from "@vueda/components/ObjectsGridCardCellSkeleton.vue";
import ObjectsGridTableHeader from "@vueda/components/ObjectsGridTableHeader.vue";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { breakpointsVueda } from "@vueda/utils/breakpoints.js";
import { useBreakpoints } from "@vueuse/core";
import { computed, effectScope, onMounted, reactive, toRef, useSlots, watch } from "vue";

/**
 * Renders a list of objects as either a table or a card grid depending on the
 * current breakpoint. Supports sorting, skeleton loading rows, field-level slot
 * overrides, and per-field class customization.
 */
defineOptions({});

const props = defineProps({
    /** Ordered array of row objects to render. */
    objectsInOrder: {
        type: Array,
        default: () => [],
        required: false,
    },
    /** Map of related object keys to their data, passed to each cell slot. */
    relatedObjects: {
        type: Object,
        default: () => ({}),
    },
    /** Map of calculated object keys to their data, passed to each cell slot. */
    calculatedObjects: {
        type: Object,
        default: () => ({}),
    },
    /** Ordered list of field names (or field descriptor objects) to render as columns. */
    fields: {
        type: Array,
        required: true,
    },
    /** Map of field names to CSS class(es) applied in both table and card layouts. */
    fieldClasses: {
        type: Object,
        default: () => ({}),
    },
    /** Map of field names to CSS class(es) applied only in table layout. */
    tableFieldClasses: {
        type: Object,
        default: () => ({}),
    },
    /** Map of field names to CSS class(es) applied only in card layout. */
    cardFieldClasses: {
        type: Object,
        default: () => ({}),
    },
    /** Extra props passed to each field slot via the slot binding. */
    fieldProps: {
        type: Object,
        default: () => ({}),
        description: "Extra props to pass to field slots.",
    },
    /** Map of field names to CSS class(es) applied to header cells in both layouts. */
    headerClasses: {
        type: Object,
        default: () => ({}),
    },
    /** Map of field names to CSS class(es) applied to header cells only in table layout. */
    tableHeaderClasses: {
        type: Object,
        default: () => ({}),
    },
    /** Map of field names to CSS class(es) applied to header cells only in card layout. */
    cardHeaderClasses: {
        type: Object,
        default: () => ({}),
    },
    /** When true, renders skeleton rows; when false, renders data rows; when undefined, inferred from objectsInOrder. */
    loading: {
        type: Boolean,
        default: undefined,
    },
    /** Text displayed when the grid has no rows to show. */
    emptyText: {
        type: String,
        default: "No records found.",
    },
    /** Tailwind breakpoint at which the layout switches from card to table view. */
    tableBreakpoint: {
        type: String,
        default: "md",
        description: "When to switch to table layout.",
    },
    /** Field names that are sortable; clicking their headers emits a sort event. */
    sortables: {
        type: Array,
        default: () => [],
        description: "Field names that can be sorted.",
    },
    /** Currently active sort fields; prefix with `-` for descending order. */
    sorted: {
        type: Array,
        default: () => [],
        description: "Field names that are sorted. Prefix each with `-` for descending on that field.",
    },
    /** CSS class(es) applied to the outermost wrapper element. */
    outerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    /** CSS class(es) applied to the table header row group. */
    headerGroupClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    /** CSS class(es) applied to each data row. */
    rowClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    /** CSS class(es) applied to the table header element. */
    headerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    /** CSS class(es) applied to the table row group. */
    rowGroupClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    /** CSS class(es) applied to each card wrapper element in card layout. */
    cardClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    /** CSS class(es) applied to each table cell. */
    cellClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    /** CSS class(es) applied to the header area of each card. */
    cardHeaderClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    /** CSS class(es) applied to each cell within a card. */
    cardCellClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    /** Name of the field used as the primary key for row identity. */
    pkKey: {
        type: String,
        default: "id",
    },
    /** Function that returns a CSS class for alternating (even) columns, or null to disable. */
    evenColumn: {
        type: Function,
        default: () => null,
    },
    /** Number of skeleton rows to render while loading. */
    skeletonRows: {
        type: Number,
        default: 25,
    },
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits(["update:sorted", "update:isTable"]);

const breakpoints = useBreakpoints(breakpointsVueda);
const isTableByBP = breakpoints.greaterOrEqual(toRef(props, "tableBreakpoint"));
// xs isn't a real breakpoint that greaterOrEqual understands. if the bp is xs, it is always table.
const isTable = computed(() => props.tableBreakpoint === "xs" || isTableByBP.value);
watch(isTable, (newValue) => {
    emit("update:isTable", newValue);
});
onMounted(() => {
    emit("update:isTable", isTable.value);
});

const sortClick = (e, fieldName) => {
    if (!props.sortables.includes(fieldName)) {
        return;
    }
    const newSorted = [...props.sorted];
    const fieldNameDesc = `-${fieldName}`;
    const index = newSorted.indexOf(fieldName);
    const indexDesc = newSorted.indexOf(fieldNameDesc);
    const notFound = index === -1 && indexDesc === -1;

    if (e.ctrlKey) {
        if (notFound) {
            newSorted.push(fieldName);
        } else if (newSorted.length === 1) {
            newSorted[0] = newSorted[0].startsWith("-") ? fieldName : fieldNameDesc;
        } else {
            newSorted.splice(index !== -1 ? index : indexDesc, 1);
        }
    } else {
        if (notFound) {
            newSorted.length = 0;
            newSorted.push(fieldName);
        } else {
            newSorted[index !== -1 ? index : indexDesc] = index !== -1 ? fieldNameDesc : fieldName;
        }
    }
    emit("update:sorted", newSorted);
};

const directionlessSorted = computed(() => props.sorted.map((field) => field.replace(/^-/, "")));
const themeContext = reactive({
    isTable,
    tableBreakpoint: toRef(props, "tableBreakpoint"),
});
const theme = useTheme("ObjectsGrid", props, themeContext, (key, kwargs) => {
    if (key === "headerCell" && kwargs.columnName && kwargs.columnIndex !== undefined) {
        return `${key}[name:${kwargs.columnName}][index:${kwargs.columnIndex}]`;
    }
    return key;
});

// todo: use useSlotNameResolver to make generic field and header slot names while retaining the ability to override
//  single fields by name
const slots = useSlots();
const slotNameResolvers = reactive({});
const fieldNames = computed(() => props.fields.map((field) => field?.name));
const slotNameResolverEffectScope = effectScope();
watch(
    fieldNames,
    (newFieldNames) => {
        const { addedKeys, removedKeys } = keyDiff(newFieldNames, Object.keys(slotNameResolvers));
        for (const key of addedKeys) {
            if (!slotNameResolvers[key]) {
                slotNameResolverEffectScope.run(() => {
                    slotNameResolvers[key] = {};
                    slotNameResolvers[key]["field"] = useSlotNameResolver([`field(${key})`, "field"], slots);
                    slotNameResolvers[key]["header"] = useSlotNameResolver([`header(${key})`, "header"], slots);
                    slotNameResolvers[key]["sortIcon"] = useSlotNameResolver([`sort-icon(${key})`, "sort-icon"], slots);
                });
            }
        }
        for (const key of removedKeys) {
            if (slotNameResolvers[key]) {
                slotNameResolvers[key].field.stop();
                slotNameResolvers[key].header.stop();
                slotNameResolvers[key].sortIcon.stop();
                delete slotNameResolvers[key];
            }
        }
    },
    {
        immediate: true,
    },
);
</script>
<template>
    <div :class="theme('root')" data-qa="objects-grid-root">
        <div :class="theme('table')" data-qa="objects-grid-table" role="table">
            <div :class="theme('headerRowGroup')" data-qa="objects-grid-header-row-group" role="rowgroup">
                <div :class="theme('headerRow')" data-qa="objects-grid-header-row" role="row">
                    <template
                        v-for="(field, columnIndex) in fields"
                        :key="field?.name || `column-index-${columnIndex}`"
                    >
                        <div
                            v-if="field?.name"
                            :class="
                                combineClasses(
                                    theme('headerCell', { columnName: field?.name, columnIndex: columnIndex }),
                                    headerClasses?.[field?.name],
                                    tableHeaderClasses?.[field?.name],
                                )
                            "
                            :data-header="field?.name"
                            data-qa="objects-grid-header"
                            role="columnheader"
                            @click="sortClick($event, field?.name)"
                        >
                            <objects-grid-table-header
                                v-if="field.extra"
                                :column-index="columnIndex"
                                :column-count="fields.length"
                                :field="field"
                            >
                                <template #label="slotProps">
                                    <!-- @slot [header(fieldName)] Override the header label cell for a specific field column. -->
                                    <slot
                                        :key="field?.name || `column-index-${columnIndex}`"
                                        :name="slotNameResolvers[field?.name]?.header?.name"
                                        v-bind="slotProps"
                                    />
                                </template>
                            </objects-grid-table-header>
                            <objects-grid-table-header
                                v-else
                                :ascending="sorted.includes(field.name)"
                                :column-index="columnIndex"
                                :column-count="fields.length"
                                :descending="sorted.includes(`-${field.name}`)"
                                :field="field"
                                :field-props="fieldProps"
                                :multi-sort-index="sorted.length > 1 ? directionlessSorted.indexOf(field.name) : -1"
                                :sortable="sortables.includes(field.name)"
                            >
                                <template #label="slotProps">
                                    <slot :name="slotNameResolvers[field?.name]?.header?.name" v-bind="slotProps" />
                                </template>
                                <template #sort-icon="slotProps">
                                    <!-- @slot [sortIcon(fieldName)] Override the sort direction icon for a specific field column. -->
                                    <slot :name="slotNameResolvers[field?.name]?.sortIcon?.name" v-bind="slotProps" />
                                </template>
                            </objects-grid-table-header>
                        </div>
                    </template>
                </div>
            </div>
            <div
                v-if="loading && !objectsInOrder?.length"
                :class="theme('bodyRowGroup')"
                data-qa="objects-grid-body-row-group-loading"
                role="rowgroup"
            >
                <div v-for="x in skeletonRows" :key="x" :class="theme('bodyRow')" role="row">
                    <component
                        :is="isTable ? EmptyComponent : 'div'"
                        :class="theme('cardContainer')"
                        data-qa="objects-grid-card-container"
                    >
                        <template v-for="(field, columnIndex) in fields" :key="`${field?.name || columnIndex}-${x}`">
                            <objects-grid-card-cell-skeleton v-if="!isTable" :field="field" />
                            <objects-grid-body-cell-skeleton v-else :field="field" />
                        </template>
                    </component>
                </div>
            </div>
            <div
                v-else-if="!objectsInOrder?.length && !loading && emptyText"
                :class="theme('bodyRowGroup')"
                data-qa="objects-grid-body-row-group-empty"
                role="rowgroup"
            >
                <div :class="theme('bodyRow')" role="row">
                    <div :class="theme('emptyText')" role="cell">
                        {{ emptyText }}
                    </div>
                </div>
            </div>
            <div v-else :class="theme('bodyRowGroup')" data-qa="objects-grid-body-row-group" role="rowgroup">
                <div
                    v-for="(obj, rowIndex) in objectsInOrder || []"
                    :key="obj?.[pkKey] || `row-index-${rowIndex}`"
                    :class="[theme('bodyRow')]"
                    data-qa="objects-grid-row"
                    role="row"
                >
                    <component
                        :is="isTable ? EmptyComponent : 'div'"
                        :class="theme('cardContainer')"
                        data-qa="objects-grid-card-container"
                    >
                        <template
                            v-for="(field, columnIndex) in fields"
                            :key="`${field?.name || columnIndex}-${rowIndex}`"
                        >
                            <template v-if="field?.name">
                                <objects-grid-card-cell
                                    v-if="!isTable"
                                    :calculated-object="calculatedObjects[obj?.[pkKey]] ?? {}"
                                    :class="
                                        combineClasses(fieldClasses?.[field?.name], cardFieldClasses?.[field?.name])
                                    "
                                    :column-index="columnIndex"
                                    :column-count="fields.length"
                                    :data-field="field?.name"
                                    :field="field"
                                    :field-props="fieldProps"
                                    :header-class="
                                        combineClasses(headerClasses?.[field?.name], cardHeaderClasses?.[field?.name])
                                    "
                                    :obj="obj"
                                    :pk="obj?.[pkKey]"
                                    :pk-key="pkKey"
                                    :related-object="relatedObjects[obj?.[pkKey]] ?? {}"
                                    role="cell"
                                    :row-index="rowIndex"
                                    :row-count="objectsInOrder.length"
                                >
                                    <template #header="slotProps">
                                        <slot :name="slotNameResolvers[field?.name]?.header?.name" v-bind="slotProps" />
                                    </template>
                                    <template #value="slotProps">
                                        <!-- @slot [field(fieldName)] Override the body cell content for a specific field column. -->
                                        <slot :name="slotNameResolvers[field?.name]?.field?.name" v-bind="slotProps" />
                                    </template>
                                </objects-grid-card-cell>
                                <objects-grid-body-cell
                                    v-else
                                    :calculated-object="calculatedObjects[obj?.[pkKey]] ?? {}"
                                    :class="
                                        combineClasses(fieldClasses?.[field?.name], tableFieldClasses?.[field?.name])
                                    "
                                    :column-index="columnIndex"
                                    :column-count="fields.length"
                                    :data-field="field?.name"
                                    :field="field"
                                    :field-props="fieldProps"
                                    :obj="obj"
                                    :pk="obj?.[pkKey]"
                                    :pk-key="pkKey"
                                    :related-object="relatedObjects[obj?.[pkKey]] ?? {}"
                                    role="cell"
                                    :row-index="rowIndex"
                                    :row-count="objectsInOrder.length"
                                >
                                    <template #value="slotProps">
                                        <slot :name="slotNameResolvers[field?.name]?.field?.name" v-bind="slotProps" />
                                    </template>
                                </objects-grid-body-cell>
                            </template>
                        </template>
                    </component>
                </div>
                <!-- @slot [row-after-objects] Content appended after all data rows in the grid body. -->
                <slot :class="[theme('bodyRow')]" name="row-after-objects" />
            </div>
        </div>
    </div>
</template>
