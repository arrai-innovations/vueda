<script setup>
import { combineClasses, keyDiff } from "@arrai-innovations/reactive-helpers";
import ObjectsGridBodyCell from "@vueda/objects-grid/ObjectsGridBodyCell.vue";
import ObjectsGridBodyCellSkeleton from "@vueda/objects-grid/ObjectsGridBodyCellSkeleton.vue";
import ObjectsGridCardCell from "@vueda/objects-grid/ObjectsGridCardCell.vue";
import ObjectsGridCardCellSkeleton from "@vueda/objects-grid/ObjectsGridCardCellSkeleton.vue";
import ObjectsGridTableHeader from "@vueda/objects-grid/ObjectsGridTableHeader.vue";
import EmptyComponent from "@vueda/support/EmptyComponent.vue";
import "@vueda/theme/vueda-tailwind/objects-grid/ObjectsGrid.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { breakpointsVueda } from "@vueda/utils/breakpoints.js";
import { useBreakpoints } from "@vueuse/core";
import { computed, effectScope, onMounted, reactive, toRef, useSlots, watch } from "vue";

/**
 * Renders a list of objects as either a table or a card grid depending on the
 * current breakpoint. Supports skeleton loading rows, field-level slot overrides,
 * and per-field class customization.
 */
defineOptions({});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
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
    /** Text displayed when the grid has no rows to show. Pass `null` to suppress the empty-state row entirely. */
    emptyText: {
        type: String,
        default: "No records found.",
    },
    /** Empty-state variant: `empty` (default), `loading`, `error`, or `filtered`. Drives `data-variant` on the empty content wrapper. */
    emptyVariant: {
        type: String,
        default: "empty",
        validator: (value) => ["empty", "loading", "error", "filtered"].includes(value),
    },
    /** Tailwind breakpoint at which the layout switches from card to table view. */
    tableBreakpoint: {
        type: String,
        default: "lg",
        description: "When to switch to table layout.",
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
    /** Function `(obj, rowIndex) => attrs` returning extra attributes (typically `data-*`) merged onto the body row element. */
    rowAttrs: {
        type: Function,
        default: () => null,
    },
    /** Row-height density tier in table layout: `default` 32px, `compact` 28px, `condensed` 24px. */
    density: {
        type: String,
        default: "default",
        validator: (value) => ["default", "compact", "condensed"].includes(value),
    },
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits(["update:isTable"]);

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

const icons = useIcons("ObjectsGrid", props);
const emptyIconEntry = computed(() => icons(props.emptyVariant));

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
const hasEmptySlot = computed(() => !!slots.empty);
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
                });
            }
        }
        for (const key of removedKeys) {
            if (slotNameResolvers[key]) {
                slotNameResolvers[key].field.stop();
                slotNameResolvers[key].header.stop();
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
    <div :class="theme('root')" :style="theme.hideStyle?.value" :data-density="density" data-qa="objects-grid-root">
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
                            :data-numeric="field?.numeric || undefined"
                            data-qa="objects-grid-header"
                            role="columnheader"
                        >
                            <objects-grid-table-header
                                :column-index="columnIndex"
                                :column-count="fields.length"
                                :field="field"
                                :field-props="field.extra ? undefined : fieldProps"
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
                v-else-if="!objectsInOrder?.length && !loading && (hasEmptySlot || emptyText)"
                :class="theme('bodyRowGroup')"
                data-qa="objects-grid-body-row-group-empty"
                role="rowgroup"
            >
                <div :class="[theme('bodyRow'), 'col-span-full']" role="row">
                    <div :class="theme('emptyText')" role="cell">
                        <div :class="theme('emptyContent')" :data-variant="emptyVariant">
                            <!-- @slot Replaces the default empty-state body. Receives `variant` (the resolved emptyVariant). Compose icon (with `data-slot="icon"`), title, description, and actions. -->
                            <slot name="empty" :variant="emptyVariant">
                                <component
                                    :is="emptyIconEntry.component"
                                    v-if="emptyIconEntry"
                                    v-bind="emptyIconEntry.props"
                                    aria-hidden="true"
                                    data-slot="icon"
                                />
                                <strong v-if="emptyText" class="font-semibold text-foreground">{{ emptyText }}</strong>
                            </slot>
                        </div>
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
                    v-bind="rowAttrs(obj, rowIndex) || {}"
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
                                    :data-numeric="field?.numeric || undefined"
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
