<script setup>
import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import isArray from "lodash-es/isArray.js";
import isEmpty from "lodash-es/isEmpty.js";
import isObject from "lodash-es/isObject.js";
import Button from "primevue/button";
import Popover from "primevue/popover";
import { computed, ref } from "vue";

const props = defineProps({
    filterName: {
        type: String,
        required: true,
    },
    index: {
        type: Number,
        required: true,
    },
    filterDetails: {
        type: Object,
        required: true,
    },
});
// TODO: this is built assuming each filter field has only one lookup expression
const emit = defineEmits(["remove-filter"]);
const op = ref();

const addedFilters = defineModel({
    type: Object,
    required: true,
});

const toggle = (event) => {
    op.value.toggle(event);
};
const displayFilterValue = computed(() => {
    const filters = addedFilters.value.filter((filter) => filter.field === props.filterName);
    return filters
        .map((filter) => {
            if (isArray(filter.value)) {
                return filter.value.join(",");
            } else if (isObject(filter.value)) {
                if (filter.is_range) {
                    const keys = Object.keys(filter.value);
                    return `${filter.value[keys[0]] ?? ""} - ${filter.value[keys[1]] ?? ""}`;
                }
                return Object.keys(filter.value)
                    .map((key) => {
                        return `${key}: ${filter.value[key]}`;
                    })
                    .join(", ");
            } else {
                return `${filter.value}`;
            }
        })
        .join(", ");
});

const computedFilterLabel = computed(() => {
    const filterLabel = props.filterDetails.label ?? props.filterName;
    if (addedFilters.value.some((filter) => filter.field === props.filterName)) {
        const label = `${filterLabel} | ${displayFilterValue.value}`;
        if (op.value && op.value.visible) {
            return `${label} ▼`;
        }
        return `${label} ▲`;
    }
    return filterLabel;
});

const onFilter = (filter) => {
    const lookupExpressionsToParams = [];
    // TODO: this now handle handles with single lookup expression
    const lookupExpression = filter.lookupExpression === false ? undefined : props.filterDetails.lookupExprs?.[0];
    console.log("lookupExpression", lookupExpression);
    const key = lookupExpression ? `${filter.name}__${lookupExpression}` : filter.name;
    if (props.filterDetails.suffixes?.length) {
        props.filterDetails.suffixes.forEach((suffix) => {
            const p = lookupExpression ? `${filter.name}_${suffix}__${lookupExpression}` : `${filter.name}_${suffix}`;

            lookupExpressionsToParams.push(p);
        });
    }
    //TODO: This is kinda hard coded
    let filterValue = filter.value;
    if (filter.range && lookupExpressionsToParams.length) {
        filterValue = {};
        filter.value.forEach((value, index) => {
            if (value === null) {
                return;
            }
            const key = lookupExpressionsToParams[index];
            filterValue[key] = new Date(value).toISOString().split("T")[0];
        });
    }
    console.log("filterValue", filterValue);
    if (!addedFilters.value.some((filter) => filter.key === key)) {
        if (isEmpty(filterValue)) {
            return;
        }
        addedFilters.value.push({
            field: filter.name,
            key,
            expression: lookupExpression,
            param: lookupExpressionsToParams.length ? lookupExpressionsToParams : key,
            value: filterValue,
            label: ``,
            is_range: filter.range,
        });
    } else {
        if (isEmpty(filterValue)) {
            removeFilter();
        }
        assignReactiveObject(
            addedFilters,
            addedFilters.value.map((f) => {
                if (f.field === filter.name) {
                    return {
                        ...f,
                        value: filterValue,
                    };
                }
                return f;
            }),
        );
    }
    op.value.hide();
};
const removeFilter = () => {
    assignReactiveObject(
        addedFilters,
        addedFilters.value.filter((f) => {
            return !(f.field === props.filterName);
        }),
    );
    emit("remove-filter", props.filterName);
};

const hasFilterValue = computed(() => {
    return addedFilters.value.some((filter) => filter.field === props.filterName);
});
const buttonClass = computed(() => {
    return hasFilterValue.value ? "" : "!border-dashed";
});
</script>

<template>
    <slot :has-filter="hasFilterValue" :name="`filter-button(${filterName})`">
        <Button
            :class="buttonClass"
            :label="computedFilterLabel"
            rounded
            size="small"
            variant="outlined"
            @click="toggle"
        >
            <template #icon>
                <span v-if="hasFilterValue" @click.prevent="removeFilter"> ✖️ </span>
                <span v-else> ➕ </span>
            </template>
        </Button>
    </slot>
    <Popover ref="op" @filter.prevent="onFilter">
        <slot
            :filter-details="filterDetails"
            :has-filter="hasFilterValue"
            :name="`filter-form(${filterName})`"
            :on-filter="onFilter"
        ></slot>
    </Popover>
</template>
