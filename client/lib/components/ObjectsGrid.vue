<script setup>
import EmptyComponent from "@vueda/components/EmptyComponent.vue";
import ObjectsGridBodyCell from "@vueda/components/ObjectsGridBodyCell.vue";
import ObjectsGridCardCell from "@vueda/components/ObjectsGridCardCell.vue";
import ObjectsGridTableHeader from "@vueda/components/ObjectsGridTableHeader.vue";
import vuedaTailwind from "@vueda/theme/vueda-tailwind";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { breakpointsTailwind } from "@vueda/utils/breakpoints.js";
import { useBreakpoints } from "@vueuse/core";
import Checkbox from "primevue/checkbox";
import { computed, reactive, toRef } from "vue";

const props = defineProps({
    titleFieldName: {
        type: String,
        default: "",
    },
    objectsInOrder: {
        type: [Array, undefined],
        default: () => [],
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
    fieldProps: {
        type: Object,
        default: () => ({}),
        description: "Extra props to pass to field slots.",
    },
    headerClasses: {
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
    oddCardOrRowClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    evenTwoColumnCardClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    oddTwoColumnCardClass: {
        type: [String, Array, Object],
        default: () => [],
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
    selectable: {
        type: Boolean,
        default: false,
    },
    selected: {
        type: Array,
        default: () => [],
    },
    pkKey: {
        type: String,
        default: "id",
    },
});
const emit = defineEmits(["update:sorted", "update:selected"]);

const breakpoints = useBreakpoints(breakpointsTailwind);
const isTable = breakpoints.greaterOrEqual(toRef(props, "tableBreakpoint"));
const twoColumns = breakpoints.between("sm", toRef(props, "tableBreakpoint"));
const evenCard = (index) => {
    if (isTable.value || !twoColumns.value) {
        return index % 2 === 0;
    }
    // checkerboard pattern
    return index % 4 === 1 || index % 4 === 2;
};

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
const themeProps = reactive({
    isTable,
    tableBreakpoint: toRef(props, "tableBreakpoint"),
});
const theme = useComputedClasses(vuedaTailwind.ObjectsGrid, themeProps, (key, kwargs) => {
    if ("evenCard" in kwargs) {
        return key + (kwargs.evenCard ? "Even" : "Odd");
    }
    return key;
});
// selected_ is the reserved name for the selected checkbox, the trailing _ is not allowed in django model field names
</script>
<template>
    <div :class="theme('root')" role="table">
        <div :class="theme('headerRowGroup')" role="rowgroup">
            <div :class="theme('headerRow')" role="row">
                <div v-if="selectable" :class="[theme('headerCell'), headerClasses?.selected_]">
                    <slot name="header(selected_)" v-bind="fieldProps" />
                </div>
                <template v-for="(field, colIndex) in fields" :key="field?.name">
                    <div
                        v-if="field?.name"
                        :class="[theme('headerCell'), headerClasses?.[field?.name]]"
                        :data-header="field?.name"
                        data-qa="objects-grid-header"
                        role="columnheader"
                        @click="sortClick($event, field?.name)"
                    >
                        <objects-grid-table-header
                            :ascending="sorted.includes(field.name)"
                            :col-index="colIndex"
                            :descending="sorted.includes(`-${field.name}`)"
                            :field="field"
                            :field-props="fieldProps"
                            :multi-sort-index="sorted.length > 1 ? directionlessSorted.indexOf(field.name) : undefined"
                            :sortable="sortables.includes(field.name)"
                        >
                            <template v-if="$slots['sort-icon']" #sort-icon="slotProps">
                                <slot name="sort-icon" v-bind="slotProps" />
                            </template>
                        </objects-grid-table-header>
                    </div>
                </template>
            </div>
        </div>
        <div v-if="!objectsInOrder?.length && !loading && emptyText" :class="theme('bodyRowGroup')" role="rowgroup">
            <div :class="theme('bodyRow')" role="row">
                <div :class="theme('emptyText')" role="cell">
                    {{ emptyText }}
                </div>
            </div>
        </div>
        <div v-else :class="theme('bodyRowGroup')" role="rowgroup">
            <div
                v-for="(obj, rowIndex) in objectsInOrder || []"
                :key="obj?.[pkKey]"
                :class="[
                    theme('bodyRow', {
                        evenCard: evenCard(rowIndex),
                    }),
                ]"
                data-qa="objects-grid-row"
                role="row"
            >
                <template v-if="selectable">
                    <objects-grid-card-cell
                        v-if="!isTable"
                        :calculated-object="{}"
                        :class="fieldClasses?.selected_"
                        :col-index="-1"
                        :field="{
                            name: 'selected_',
                            label: '',
                        }"
                        :obj="{ [pkKey]: obj?.[pkKey] }"
                        :related-object="{}"
                        :row-index="rowIndex"
                    >
                        <template #header>
                            <slot name="header(selected_)" v-bind="fieldProps">
                                <empty-component />
                            </slot>
                        </template>
                        <template #value>
                            <slot
                                :emit-selected="(e) => emit('update:selected', e)"
                                name="field(selected_)"
                                :obj="obj"
                                :pk="obj?.[pkKey]"
                                :pk-key="pkKey"
                                :row-index="rowIndex"
                                :selected="selected"
                                v-bind="fieldProps"
                            >
                                <Checkbox
                                    :input-id="`selected-row-${obj?.[pkKey]}`"
                                    :model-value="selected"
                                    name="selected"
                                    :value="obj?.[pkKey]"
                                    @update:model-value="emit('update:selected', $event)"
                                />
                            </slot>
                        </template>
                    </objects-grid-card-cell>
                    <objects-grid-body-cell
                        v-else
                        :calculated-object="{}"
                        :class="fieldClasses?.selected_"
                        :col-index="-1"
                        :field="{
                            name: 'selected_',
                            label: '',
                        }"
                        :field-props="fieldProps"
                        :obj="{ [pkKey]: obj?.[pkKey] }"
                        :related-object="{}"
                        :row-index="rowIndex"
                    >
                        <template #value>
                            <slot
                                :emit-selected="(e) => emit('update:selected', e)"
                                name="field(selected_)"
                                :obj="obj"
                                :pk="obj?.[pkKey]"
                                :pk-key="pkKey"
                                :row-index="rowIndex"
                                :selected="selected"
                                v-bind="fieldProps"
                            >
                                <Checkbox
                                    :input-id="`selected-row-${obj?.[pkKey]}`"
                                    :model-value="selected"
                                    name="selected"
                                    :value="obj?.[pkKey]"
                                    @update:model-value="emit('update:selected', $event)"
                                />
                            </slot>
                        </template>
                    </objects-grid-body-cell>
                </template>
                <template v-for="(field, colIndex) in fields" :key="field?.name">
                    <template v-if="field?.name">
                        <objects-grid-card-cell
                            v-if="!isTable"
                            :calculated-object="calculatedObjects[obj?.[pkKey]] ?? {}"
                            :class="fieldClasses?.[field?.name]"
                            :col-index="colIndex"
                            :data-field="field?.name"
                            data-qa="objects-grid-card-cell"
                            :field="field"
                            :field-props="fieldProps"
                            :obj="obj"
                            :pk="obj?.[pkKey]"
                            :pk-key="pkKey"
                            :related-object="relatedObjects[obj?.[pkKey]] ?? {}"
                            role="cell"
                            :row-index="rowIndex"
                        >
                            <template #header="slotProps">
                                <slot :name="`header(${field?.name})`" v-bind="slotProps" />
                            </template>
                            <template #value="slotProps">
                                <slot :name="`field(${field?.name})`" v-bind="slotProps" />
                            </template>
                        </objects-grid-card-cell>
                        <objects-grid-body-cell
                            v-else
                            :calculated-object="calculatedObjects[obj?.[pkKey]] ?? {}"
                            :class="fieldClasses?.[field?.name]"
                            :col-index="colIndex"
                            :data-field="field?.name"
                            data-qa="objects-grid-table-cell"
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
                                <slot :name="`field(${field?.name})`" v-bind="slotProps" />
                            </template>
                        </objects-grid-body-cell>
                    </template>
                </template>
            </div>
        </div>
    </div>
</template>
