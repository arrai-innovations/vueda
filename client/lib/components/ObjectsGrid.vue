<script setup>
import { combineClasses, keyDiff } from "@arrai-innovations/reactive-helpers";
import EmptyComponent from "@vueda/components/EmptyComponent.vue";
import ObjectsGridBodyCell from "@vueda/components/ObjectsGridBodyCell.vue";
import ObjectsGridCardCell from "@vueda/components/ObjectsGridCardCell.vue";
import ObjectsGridTableHeader from "@vueda/components/ObjectsGridTableHeader.vue";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { breakpointsVueda } from "@vueda/utils/breakpoints.js";
import { useBreakpoints } from "@vueuse/core";
import { computed, effectScope, onMounted, reactive, toRef, useSlots, watch } from "vue";

const props = defineProps({
    titleFieldName: {
        type: String,
        default: "",
    },
    objectsInOrder: {
        type: Array,
        default: () => [],
        required: false,
    },
    relatedObjects: {
        type: Object,
        default: () => ({}),
    },
    calculatedObjects: {
        type: Object,
        default: () => ({}),
    },
    fields: {
        type: Array,
        required: true,
    },
    fieldClasses: {
        type: Object,
        default: () => ({}),
    },
    tableFieldClasses: {
        type: Object,
        default: () => ({}),
    },
    cardFieldClasses: {
        type: Object,
        default: () => ({}),
    },
    fieldProps: {
        type: Object,
        default: () => ({}),
        description: "Extra props to pass to field slots.",
    },
    headerClasses: {
        type: Object,
        default: () => ({}),
    },
    tableHeaderClasses: {
        type: Object,
        default: () => ({}),
    },
    cardHeaderClasses: {
        type: Object,
        default: () => ({}),
    },
    loading: {
        type: Boolean,
        default: undefined,
    },
    emptyText: {
        type: String,
        default: "No records found.",
    },
    tableBreakpoint: {
        type: String,
        default: "md",
        description: "When to switch to table layout.",
    },
    sortables: {
        type: Array,
        default: () => [],
        description: "Field names that can be sorted.",
    },
    sorted: {
        type: Array,
        default: () => [],
        description: "Field names that are sorted. Prefix each with `-` for descending on that field.",
    },
    variant: {
        type: String,
        default: "default",
    },
    outerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    headerGroupClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    rowClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    headerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    rowGroupClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    cardClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    cellClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    cardHeaderClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    cardCellClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    pkKey: {
        type: String,
        default: "id",
    },
    evenColumn: {
        type: Function,
        default: () => null,
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
const fieldNames = computed(() => props.fields.map((field) => field.name));
const slotNameResolverEffectScope = effectScope();
watch(
    fieldNames,
    (newFieldNames) => {
        slotNameResolverEffectScope.run(() => {
            const { addedKeys } = keyDiff(newFieldNames, Object.keys(slotNameResolvers));
            for (const key of addedKeys) {
                if (!slotNameResolvers[key]) {
                    slotNameResolvers[key] = {};
                    slotNameResolvers[key]["field"] = useSlotNameResolver([`field(${key})`, "field"], slots);
                    slotNameResolvers[key]["header"] = useSlotNameResolver([`header(${key})`, "header"], slots);
                    slotNameResolvers[key]["sortIcon"] = useSlotNameResolver([`sort-icon(${key})`, "sort-icon"], slots);
                }
            }
            // we don't delete. the effectScope will clean up when we unmount.
            //  if you re-add, the name is all that matters, so existing resolvers can be reused.
        });
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
                            <objects-grid-table-header v-if="field.extra" :column-index="columnIndex" :field="field">
                                <template #label="slotProps">
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
                                    <slot :name="slotNameResolvers[field?.name]?.sortIcon?.name" v-bind="slotProps" />
                                </template>
                            </objects-grid-table-header>
                        </div>
                    </template>
                </div>
            </div>
            <div
                v-if="!objectsInOrder?.length && !loading && emptyText"
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
                                >
                                    <template #header="slotProps">
                                        <slot :name="slotNameResolvers[field?.name]?.header?.name" v-bind="slotProps" />
                                    </template>
                                    <template #value="slotProps">
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
                                    :data-field="field?.name"
                                    :field="field"
                                    :field-props="fieldProps"
                                    :obj="obj"
                                    :pk="obj?.[pkKey]"
                                    :pk-key="pkKey"
                                    :related-object="relatedObjects[obj?.[pkKey]] ?? {}"
                                    role="cell"
                                    :row-index="rowIndex"
                                >
                                    <template #value="slotProps">
                                        <slot :name="slotNameResolvers[field?.name]?.field?.name" v-bind="slotProps" />
                                    </template>
                                </objects-grid-body-cell>
                            </template>
                        </template>
                    </component>
                </div>
            </div>
        </div>
    </div>
</template>
