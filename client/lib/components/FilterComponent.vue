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
const emit = defineEmits(["hide-filter-form"]);
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
            const values = filter.labelValue ?? filter.value;
            if (isArray(values)) {
                return values.join(",");
            } else if (isObject(values)) {
                if (filter.is_range) {
                    const keys = Object.keys(values);
                    if (keys.length === 2) {
                        return `${values[keys[0]] ?? ""} - ${values[keys[1]] ?? ""}`;
                    } else if (keys.length === 1) {
                        return `${keys[0]}: ${values[keys[0]] ?? ""}`;
                    }
                    return "";
                }
                return Object.keys(values)
                    .map((key) => {
                        return `${key}: ${values[key]}`;
                    })
                    .join(", ");
            } else {
                return `${values}`;
            }
        })
        .join(", ");
});

const computedFilterLabel = computed(() => {
    const filterLabel = props.filterDetails.label ?? props.filterName;
    if (addedFilters.value.some((filter) => filter.field === props.filterName)) {
        const label = `${filterLabel} | ${displayFilterValue.value}`;
        if (op.value && op.value.visible) {
            return `${label}  ▼`;
        }
        return `${label}  ▲`;
    }
    return filterLabel;
});

const onFilter = (filter) => {
    const lookupExpressionsToParams = [];
    // TODO: this now handle handles with single lookup expression
    const lookupExpression = filter.lookupExpression === false ? undefined : props.filterDetails.lookupExprs?.[0];
    const key = lookupExpression ? `${filter.name}__${lookupExpression}` : filter.name;
    if (props.filterDetails.suffixes?.length) {
        props.filterDetails.suffixes.forEach((suffix) => {
            const p = lookupExpression ? `${filter.name}_${suffix}__${lookupExpression}` : `${filter.name}_${suffix}`;

            lookupExpressionsToParams.push(p);
        });
    }
    //TODO: This is kinda hard coded for dates only
    const filterValue = filter.value;
    let labelValue = filter.labelValue;
    if (filter.range && lookupExpressionsToParams.length) {
        const keys = Object.keys(filterValue);
        if (!filter.labelValue) {
            labelValue = {};
            for (const key of keys) {
                const value = filterValue[key];
                if (!value) {
                    continue;
                }
                labelValue[key] = new Date(value).toISOString().split("T")[0];
            }
        }
    }
    const filterObject = {
        field: filter.name,
        key,
        isValueRawObject: filter.isValueRawObject,
        expression: lookupExpression,
        param: lookupExpressionsToParams.length ? lookupExpressionsToParams : key,
        value: filterValue,
        labelValue: labelValue,
        is_range: filter.range,
    };
    if (!addedFilters.value.some((filter) => filter.key === key)) {
        if (isEmpty(filterValue)) {
            return;
        }
        addedFilters.value.push(filterObject);
    } else {
        if (isEmpty(filterValue)) {
            removeFilter();
        }
        assignReactiveObject(
            addedFilters,
            addedFilters.value.map((f) => {
                if (f.field === filter.name) {
                    return filterObject;
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
                <slot :has-filter-value="hasFilterValue" name="filter-button-icon" :remove-filter="removeFilter">
                    <span v-if="hasFilterValue" @click.prevent="removeFilter"> ✖️ </span>
                    <span v-else> ➕ </span>
                </slot>
            </template>
        </Button>
    </slot>
    <Popover ref="op" @filter.prevent="onFilter" @show="emit('hide-filter-form', filterName)">
        <slot
            :filter-details="filterDetails"
            :has-filter="hasFilterValue"
            :name="`filter-form(${filterName})`"
            :on-filter="onFilter"
        ></slot>
    </Popover>
</template>
