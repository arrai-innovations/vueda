<script setup>
import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import isArray from "lodash-es/isArray.js";
import isEmpty from "lodash-es/isEmpty.js";
import isObject from "lodash-es/isObject.js";
import Button from "primevue/button";
import Popover from "primevue/popover";
import { computed, reactive, ref, toRefs, unref, useSlots, useTemplateRef } from "vue";

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
    ...THEME_OVERRIDE_PROPS,
});
// TODO: this is built assuming each filter field has only one lookup expression
const emit = defineEmits(["hide-filter-form"]);
const popoverRef = useTemplateRef("popoverRef");

const addedFilters = defineModel({
    type: Object,
    required: true,
});

const internalShowState = ref(false);
const doToggle = (event) => {
    if (event) {
        event.preventDefault();
    }
    internalShowState.value = !internalShowState.value;
    if (!slots[filterFormPopoverSlotNames.name]) {
        popoverRef.value.toggle(event);
    }
};
const slots = useSlots();
const filterButtonSlotNames = useSlotNameResolver(
    computed(() => [`filter-button(${props.filterName})`, `filter-button`]),
);
const filterButtonIconSlotNames = useSlotNameResolver(
    computed(() => [`filter-button-icon(${props.filterName})`, `filter-button-icon`]),
);
const filterFormPopoverSlotNames = useSlotNameResolver(
    computed(() => [`filter-form-popover(${props.filterName})`, `filter-form-popover`]),
);
const filterFormSlotNames = useSlotNameResolver(computed(() => [`filter-form(${props.filterName})`, `filter-form`]));

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
        return `${filterLabel} | ${displayFilterValue.value}  ${unref(internalShowState) ? "▼" : "▲"}`;
    }
    return filterLabel;
});

const applyFilter = (e, filter) => {
    if (e && e.preventDefault) {
        e.preventDefault();
    } else {
        filter = e;
    }
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
        if (isEmpty(filterValue) || (filter.range && isRangeObjectEmpty(filterValue))) {
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
    internalShowState.value = false;
    if (slots[filterFormPopoverSlotNames.name]) {
        emit("hide-filter-form", props.filterName);
    } else {
        popoverRef.value.hide();
    }
};

const isRangeObjectEmpty = (rangeObject) => {
    return Object.values(rangeObject).every((value) => !value);
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
const themeProps = reactive({
    ...toRefs(props),
    hasFilterValue,
});
const theme = useTheme("FilterComponent", props, themeProps);
</script>

<template>
    <slot
        :class="theme('button')"
        :do-toggle="doToggle"
        :filter-details="filterDetails"
        :filter-name="filterName"
        :has-filter-value="hasFilterValue"
        :label="computedFilterLabel"
        :name="filterButtonSlotNames.name"
        :remove-filter="removeFilter"
    >
        <Button
            :class="theme('button')"
            :label="computedFilterLabel"
            rounded
            size="small"
            variant="outlined"
            @click="doToggle"
        >
            <template #icon>
                <slot
                    :filter-details="filterDetails"
                    :filter-name="filterName"
                    :has-filter-value="hasFilterValue"
                    :name="filterButtonIconSlotNames.name"
                    :remove-filter="removeFilter"
                >
                    <span v-if="hasFilterValue" @click.prevent="removeFilter"> ✖️ </span>
                    <span v-else> ➕ </span>
                </slot>
            </template>
        </Button>
    </slot>
    <slot
        :apply-filter="applyFilter"
        :class="theme('popover')"
        :do-toggle="doToggle"
        :filter-details="filterDetails"
        :filter-name="filterName"
        :has-filter-value="hasFilterValue"
        :name="filterFormPopoverSlotNames.name"
    >
        <Popover
            ref="popoverRef"
            :apply-filter="applyFilter"
            :class="theme('popover')"
            :filter-details="filterDetails"
            :filter-name="filterName"
            :has-filter-value="hasFilterValue"
        >
            <slot
                :apply-filter="applyFilter"
                :filter-details="filterDetails"
                :filter-name="filterName"
                :has-filter-value="hasFilterValue"
                :name="filterFormSlotNames.name"
            />
        </Popover>
    </slot>
</template>
