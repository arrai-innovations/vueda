<script setup>
import { faDownLong, faUpDown, faUpLong } from "@arrai-innovations/sharp-solid-svg-icons";
import { FontAwesomeIcon } from "@arrai-innovations/vue-fontawesome";
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import { breakpointsTailwind, useBreakpoints } from "@vueuse/core";
import get from "lodash-es/get.js";
import { computed, ref } from "vue";

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
    sortable: {
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
});
const emit = defineEmits(["update:sorted"]);

const combinedClasses = useCombinedClasses("ObjectsGrid", props);

const breakpoints = useBreakpoints(breakpointsTailwind);
const isTable = breakpoints.greaterOrEqual(props.tableBreakpoint);
const twoColumns = breakpoints.between("sm", props.tableBreakpoint);
const printing = ref(false);

const oddEvenClassesLookup = [
    combinedClasses.oddTwoColumnCardClass,
    combinedClasses.evenTwoColumnCardClass,
    combinedClasses.evenTwoColumnCardClass,
    combinedClasses.oddTwoColumnCardClass,
];

const oddEvenClasses = (index) => {
    if (isTable.value || !twoColumns.value) {
        return combinedClasses.oddCardOrRowClass;
    }
    return oddEvenClassesLookup[index % 4];
};

const sortClick = (e, fieldName) => {
    if (!props.sortable.includes(fieldName)) {
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

const sortIcon = (fieldName) => {
    if (props.sorted.includes(fieldName)) {
        return faDownLong;
    } else if (props.sorted.includes(`-${fieldName}`)) {
        return faUpLong;
    } else if (props.sortable.includes(fieldName)) {
        return faUpDown;
    }
};

const directionlessSorted = computed(() => props.sorted.map((field) => field.replace(/^-/, "")));
</script>

<template>
    <div :class="[combinedClasses.outerClass, { '!table': printing }]" role="table">
        <div
            v-if="isTable || printing"
            :class="[combinedClasses.headerGroupClass, { '!table-header-group': printing }]"
            role="rowgroup"
        >
            <div :class="[combinedClasses.rowClass, { '!table-row': printing }]" role="row">
                <div
                    v-for="(field, colIndex) in fields"
                    :key="field.name"
                    :class="[combinedClasses.headerClass, headerClasses?.[field.name]]"
                    :data-header="field.name"
                    data-qa="objects-grid-header"
                    role="columnheader"
                    @click="sortClick($event, field.name)"
                >
                    <slot :col-index="colIndex" :field="field" :name="`header(${field.name})`">{{ field.label }}</slot>
                    <span
                        v-if="sortable.includes(field.name)"
                        :class="combinedClasses.sortClass"
                        :data-qa="`objects-grid-sort-${field.name}`"
                    >
                        <font-awesome-icon fixed-width :icon="sortIcon(field.name)" />
                        <span v-if="sorted?.length > 1" :class="combinedClasses.sortNumClass">{{
                            directionlessSorted.indexOf(field.name) + 1
                        }}</span>
                    </span>
                </div>
            </div>
        </div>
        <div
            v-if="!objectsInOrder?.length && !loading && emptyText"
            :class="combinedClasses.rowGroupClass"
            role="rowgroup"
        >
            <div role="row">
                <!-- hack to get the colspan to work -->
                <!--suppress HtmlUnknownTag -->
                <td
                    v-if="printing || isTable"
                    :class="combinedClasses.emptyTextClass"
                    :colspan="fields.length"
                    role="cell"
                >
                    {{ emptyText }}
                </td>
                <div v-else class="w-full" :class="combinedClasses.emptyTextClass" role="cell">{{ emptyText }}</div>
            </div>
        </div>
        <div
            :class="[
                combinedClasses.rowGroupClass,
                combinedClasses.rowGroupCardsClass,
                { '!table-row-group': printing },
            ]"
            role="rowgroup"
        >
            <div
                v-for="(obj, rowIndex) in objectsInOrder || []"
                :key="obj?.id"
                :class="[combinedClasses.cardClass, oddEvenClasses(rowIndex), { '!table-row': printing }]"
                data-qa="objects-grid-row"
                role="row"
            >
                <div
                    v-for="(field, colIndex) in fields"
                    :key="field.name"
                    :class="[combinedClasses.cellClass, fieldClasses?.[field.name], { '!table-cell': printing }]"
                    :data-field="field.name"
                    data-qa="objects-grid-cell"
                    role="cell"
                >
                    <div v-if="!isTable && !printing">
                        <div :class="combinedClasses.cardHeaderClass" :data-card-header="field.name">
                            <slot :col-index="colIndex" :field="field" :name="`header(${field.name})`">
                                {{ field.label }}
                            </slot>
                        </div>
                        <div :class="combinedClasses.cardCellClass" :data-card="field.name">
                            <slot v-if="colIndex === 0" name="link-field" :pk="obj?.id" :value="get(obj, field.name)">
                            </slot>
                            <slot
                                v-else
                                :calculated="get(get(calculatedObjects, obj.id), field.name)"
                                :calculated-obj="get(calculatedObjects, obj.id)"
                                :col-index="colIndex"
                                :field="field"
                                :name="`field(${field.name})`"
                                :obj="obj"
                                :related="get(get(relatedObjects, obj.id), field.name)"
                                :related-obj="get(relatedObjects, obj.id)"
                                :row-index="rowIndex"
                                :value="get(obj, field.name)"
                            >
                                {{ get(obj, field.name) }}
                            </slot>
                        </div>
                    </div>
                    <slot
                        v-else
                        :calculated="get(get(calculatedObjects, obj.id), field.name)"
                        :calculated-obj="get(calculatedObjects, obj.id)"
                        :col-index="colIndex"
                        :field="field"
                        :name="`field(${field.name})`"
                        :obj="obj"
                        :related="get(get(relatedObjects, obj.id), field.name)"
                        :related-obj="get(relatedObjects, obj.id)"
                        :row-index="rowIndex"
                        :value="get(obj, field.name)"
                    >
                        <slot v-if="colIndex === 0" name="link-field" :pk="obj?.id" :value="get(obj, field.name)">
                        </slot>
                        <p v-else>{{ get(obj, field.name) }}</p>
                    </slot>
                </div>
            </div>
        </div>
    </div>
</template>
