<script setup>
import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import isArray from "lodash-es/isArray.js";
import isEmpty from "lodash-es/isEmpty.js";
import isObject from "lodash-es/isObject.js";
import Button from "primevue/button";
import ButtonGroup from "primevue/buttongroup";
import Popover from "primevue/popover";
import { computed, reactive, ref, useSlots, useTemplateRef } from "vue";

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
    listArgs: {
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
const slots = useSlots();
const resolvedSlotNamesArgs = {
    clearButton: computed(() => [`filter-clear-button(${props.filterName})`, "filter-clear-button"]),
    clearButtonIcon: computed(() => [`filter-clear-button-icon(${props.filterName})`, "filter-clear-button-icon"]),
    dropdownButton: computed(() => [`filter-dropdown-button(${props.filterName})`, "filter-dropdown-button"]),
    dropdownButtonIcon: computed(() => [
        `filter-dropdown-button-icon(${props.filterName})`,
        "filter-dropdown-button-icon",
    ]),
    dropdownButtonLabel: computed(() => [
        `filter-dropdown-button-label(${props.filterName})`,
        "filter-dropdown-button-label",
    ]),
    dropdownButtonSuffix: computed(() => [
        `filter-dropdown-button-suffix(${props.filterName})`,
        "filter-dropdown-button-suffix",
    ]),
    formPopover: computed(() => [`filter-form-popover(${props.filterName})`, "filter-form-popover"]),
    form: computed(() => [`filter-form(${props.filterName})`, "filter-form"]),
};
const resolvedSlotNames = Object.fromEntries(
    Object.entries(resolvedSlotNamesArgs).map(([key, value]) => [key, useSlotNameResolver(value)]),
);

// watch(
//     toRef(props, "listArgs"),
//     () => {
//         const possibleFilterName = props.filterDetails.lookupExprs?.[0].map((expr) => `${props.filterName}__${expr}`);
//         //TODO: upadte the addedFilders according to listATgs here.
//         },
//     { deep: true, immediate: true },
// );

const doToggle = (event) => {
    if (event) {
        event.preventDefault();
    }
    internalShowState.value = !internalShowState.value;
    if (!slots[resolvedSlotNames.formPopover.name] && popoverRef.value) {
        popoverRef.value.toggle(event);
    }
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
        return `${filterLabel} | ${displayFilterValue.value}`;
    }
    return filterLabel;
});

const lookupExpression = computed(() => {
    return props.filterDetails.ignorelookupExprs ? undefined : props.filterDetails.lookupExprs?.[0];
});
const lookupExpressionsToParams = computed(() => {
    const lookupExpressionsToParams = [];
    if (props.filterDetails.suffixes?.length) {
        props.filterDetails.suffixes.forEach((suffix) => {
            const p = lookupExpression.value
                ? `${props.filterName}_${suffix}__${lookupExpression.value}`
                : `${props.filterName}_${suffix}`;
            lookupExpressionsToParams.push(p);
        });
    }
    return lookupExpressionsToParams;
});

const applyFilter = (e, filter) => {
    if (e && e.preventDefault) {
        e.preventDefault();
    } else {
        filter = e;
    }

    // TODO: this now handle handles with single lookup expression
    const key = lookupExpression.value ? `${filter.name}__${lookupExpression.value}` : filter.name;
    //TODO: This is kinda hard coded for dates only
    const filterValue = filter.value;
    let labelValue = filter.labelValue;
    if (filter.range && lookupExpressionsToParams.value.length) {
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
        param: lookupExpressionsToParams.value.length ? lookupExpressionsToParams : key,
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
    emit("hide-filter-form", props.filterName);
    if (!slots[resolvedSlotNames.formPopover.name] && popoverRef.value) {
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
const theme = useTheme(
    "FilterComponent",
    props,
    reactive({
        hasFilterValue,
    }),
);
</script>

<template>
    <div>
        <ButtonGroup size="small">
            <slot
                :class="theme('clearButton')"
                :do-toggle="doToggle"
                :filter-details="filterDetails"
                :filter-name="filterName"
                :has-filter-value="hasFilterValue"
                :label="computedFilterLabel"
                :name="resolvedSlotNames.clearButton.name"
                :remove-filter="removeFilter"
                severity="warn"
                :show-state="internalShowState"
            >
                <Button
                    v-if="hasFilterValue"
                    rounded
                    severity="warn"
                    size="small"
                    variant="outlined"
                    @click.prevent="removeFilter"
                >
                    <template #icon>
                        <slot
                            class="p-button-icon p-button-icon-left"
                            :filter-details="filterDetails"
                            :filter-name="filterName"
                            :has-filter-value="hasFilterValue"
                            :name="resolvedSlotNames.clearButtonIcon.name"
                            :remove-filter="removeFilter"
                            :show-state="internalShowState"
                        >
                            <span class="p-button-icon p-button-icon-left"> ✖️ </span>
                        </slot>
                    </template>
                </Button>
            </slot>
            <slot
                :class="theme('dropdownButton')"
                :do-toggle="doToggle"
                :filter-details="filterDetails"
                :filter-name="filterName"
                :has-filter-value="hasFilterValue"
                :label="computedFilterLabel"
                :name="resolvedSlotNames.dropdownButton.name"
                :remove-filter="removeFilter"
                severity="info"
                :show-state="internalShowState"
            >
                <Button
                    :class="theme('dropdownButton')"
                    :label="computedFilterLabel"
                    rounded
                    severity="info"
                    size="small"
                    variant="outlined"
                    @click="doToggle"
                >
                    <template #default>
                        <!-- primevue passes nothing via their button default slot... -->
                        <!-- when using the default slot, they don't render the icon slot... -->
                        <slot
                            v-if="!hasFilterValue"
                            class="p-button-icon p-button-icon-left"
                            :filter-details="filterDetails"
                            :filter-name="filterName"
                            :has-filter-value="hasFilterValue"
                            :name="resolvedSlotNames.dropdownButtonIcon.name"
                            :remove-filter="removeFilter"
                            :show-state="internalShowState"
                        >
                            <span class="p-button-icon p-button-icon-left"> ➕ </span>
                        </slot>
                        <slot
                            class="p-button-label"
                            :filter-details="filterDetails"
                            :filter-name="filterName"
                            :has-filter-value="hasFilterValue"
                            :label="computedFilterLabel"
                            :name="resolvedSlotNames.dropdownButtonLabel.name"
                            :show-state="internalShowState"
                        >
                            <span class="p-button-label">
                                {{ computedFilterLabel }}
                            </span>
                        </slot>
                        <slot
                            class="p-button-label"
                            :filter-details="filterDetails"
                            :filter-name="filterName"
                            :has-filter-value="hasFilterValue"
                            :label="computedFilterLabel"
                            :name="resolvedSlotNames.dropdownButtonSuffix.name"
                            :show-state="internalShowState"
                        >
                            <span class="p-button-label">
                                {{ hasFilterValue ? (internalShowState ? "▲" : "▼") : "" }}
                            </span>
                        </slot>
                    </template>
                </Button>
            </slot>
        </ButtonGroup>
        <slot
            :class="theme('formPopover')"
            :filter-details="filterDetails"
            :filter-name="filterName"
            :has-filter-value="hasFilterValue"
            :name="resolvedSlotNames.formPopover.name"
            :show-state="internalShowState"
        >
            <Popover
                ref="popoverRef"
                :apply-filter="applyFilter"
                :class="theme('formPopover')"
                :filter-details="filterDetails"
                :filter-name="filterName"
                :has-filter-value="hasFilterValue"
            >
                <slot
                    :apply-filter="applyFilter"
                    :filter-details="filterDetails"
                    :filter-name="filterName"
                    :has-filter-value="hasFilterValue"
                    :name="resolvedSlotNames.form.name"
                />
            </Popover>
        </slot>
    </div>
</template>
