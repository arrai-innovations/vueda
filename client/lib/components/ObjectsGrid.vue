<script setup>
import vuedaTailwind from "@vueda/theme/vueda-tailwind";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { breakpointsTailwind } from "@vueda/utils/breakpoints.js";
import { useBreakpoints } from "@vueuse/core";
import get from "lodash-es/get.js";
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
    selectable: {
        type: Boolean,
        default: false,
    },
    selected: {
        type: Array,
        default: () => [],
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
const unifiedGet = (obj, relatedObj, calculatedObj, fieldPath) => {
    // related. and calculated. are prefixes to the field name, which change the object we're getting from
    if (fieldPath.startsWith("related.")) {
        return get(relatedObj, fieldPath.replace("related.", ""));
    }
    if (fieldPath.startsWith("calculated.")) {
        return get(calculatedObj, fieldPath.replace("calculated.", ""));
    }
    return get(obj, fieldPath);
};
</script>
<template>
    <div :class="theme('root')" role="table">
        <div :class="theme('headerRowGroup')" role="rowgroup">
            <div :class="theme('headerRow')" role="row">
                <div v-if="selectable" :class="[theme('headerCell'), headerClasses?.selected_]">
                    <slot name="header(selected_)" />
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
                        <slot :col-index="colIndex" :field="field" :name="`header(${field?.name})`"
                            >{{ field.label }}
                        </slot>
                        <span
                            v-if="sortable.includes(field?.name)"
                            :class="theme('sort')"
                            :data-qa="`objects-grid-sort-${field?.name}`"
                        >
                            <slot :field="field" name="sort-icon" :sortable="sortable" :sorted="sorted">
                                <!-- iconless text, screams to implementors to provide an icon -->
                                <template v-if="sorted.includes(field?.name)">⬆️</template>
                                <template v-else-if="sorted.includes(`-${field?.name}`)">⬇️</template>
                                <template v-else>↕️</template>
                            </slot>
                            <span v-if="sorted?.length > 1" :class="theme('sortNum')">{{
                                directionlessSorted.indexOf(field?.name) + 1
                            }}</span>
                        </span>
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
                :key="obj?.id"
                :class="[
                    theme('bodyRow', {
                        evenCard: evenCard(rowIndex),
                    }),
                ]"
                data-qa="objects-grid-row"
                role="row"
            >
                <template v-if="selectable">
                    <div
                        :class="[!isTable ? theme('cardCell') : theme('bodyCell'), fieldClasses?.selected_]"
                        data-field="selected"
                        data-qa="objects-grid-select-cell"
                        role="cell"
                    >
                        <slot
                            :emit-selected="(e) => emit('update:selected', e)"
                            name="field(selected_)"
                            :obj="obj"
                            :row-index="rowIndex"
                            :selected="selected"
                        >
                            <Checkbox
                                :input-id="`selected-row-${obj.id}`"
                                :model-value="selected"
                                name="selected"
                                :value="obj.id"
                                @update:model-value="emit('update:selected', $event)"
                            />
                        </slot>
                    </div>
                </template>
                <template v-for="(field, colIndex) in fields" :key="field?.name">
                    <template v-if="field?.name">
                        <!-- this if let's first: and last: work, otherwise the last table cell can never be last child -->
                        <div
                            v-if="!isTable"
                            :class="[theme('cardCell'), fieldClasses?.[field?.name]]"
                            data-qa="objects-grid-card-cell"
                            role="cell"
                        >
                            <div :class="theme('cardHeader')" :data-card-header="field?.name">
                                <slot :col-index="colIndex" :field="field" :name="`header(${field?.name})`">
                                    {{ field.label }}
                                </slot>
                            </div>
                            <div :class="theme('cardValue')" :data-card="field?.name">
                                <slot
                                    :calculated-obj="get(calculatedObjects, obj.id)"
                                    :col-index="colIndex"
                                    :field="field"
                                    :formatted="
                                        field.formatted &&
                                        unifiedGet(
                                            obj,
                                            get(relatedObjects, obj.id),
                                            get(calculatedObjects, obj.id),
                                            field.formatted,
                                        )
                                    "
                                    :name="`field(${field?.name})`"
                                    :obj="obj"
                                    :related-obj="get(relatedObjects, obj.id)"
                                    :row-index="rowIndex"
                                    :value="
                                        unifiedGet(
                                            obj,
                                            get(relatedObjects, obj.id),
                                            get(calculatedObjects, obj.id),
                                            field?.name,
                                        )
                                    "
                                >
                                    {{
                                        (field.formatted ?? field?.name) &&
                                        unifiedGet(
                                            obj,
                                            get(relatedObjects, obj.id),
                                            get(calculatedObjects, obj.id),
                                            field.formatted ?? field?.name,
                                        )
                                    }}
                                </slot>
                            </div>
                        </div>
                        <div
                            v-else
                            :class="[theme('bodyCell'), fieldClasses?.[field?.name]]"
                            :data-field="field?.name"
                            data-qa="objects-grid-body-cell"
                            role="cell"
                        >
                            <slot
                                :calculated-obj="get(calculatedObjects, obj.id)"
                                :col-index="colIndex"
                                :field="field"
                                :formatted="
                                    field.formatted &&
                                    unifiedGet(
                                        obj,
                                        get(relatedObjects, obj.id),
                                        get(calculatedObjects, obj.id),
                                        field.formatted,
                                    )
                                "
                                :name="`field(${field?.name})`"
                                :obj="obj"
                                :related-obj="get(relatedObjects, obj.id)"
                                :row-index="rowIndex"
                                :value="
                                    unifiedGet(
                                        obj,
                                        get(relatedObjects, obj.id),
                                        get(calculatedObjects, obj.id),
                                        field?.name,
                                    )
                                "
                            >
                                <p>
                                    {{
                                        (field.formatted ?? field?.name) &&
                                        unifiedGet(
                                            obj,
                                            get(relatedObjects, obj.id),
                                            get(calculatedObjects, obj.id),
                                            field.formatted ?? field?.name,
                                        )
                                    }}
                                </p>
                            </slot>
                        </div>
                    </template>
                </template>
            </div>
        </div>
    </div>
</template>
