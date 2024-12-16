<script setup>
import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import isArray from "lodash-es/isArray.js";
import isEmpty from "lodash-es/isEmpty.js";
import isEqual from "lodash-es/isEqual.js";
import isObject from "lodash-es/isObject.js";
import Button from "primevue/button";
import ButtonGroup from "primevue/buttongroup";
import Popover from "primevue/popover";
import { computed, reactive, ref, toRef, useSlots, useTemplateRef, watch } from "vue";
import { useRoute } from "vue-router";

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
    filterFormValues: {
        type: Object,
        default: undefined,
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

const lookupExpression = computed(() => {
    return props.filterDetails.ignorelookupExprs ? undefined : props.filterDetails.lookupExprs?.[0];
});
const lookupExpressionsToParams = computed(() => {
    const params = [];
    if (props.filterDetails.suffixes?.length) {
        props.filterDetails.suffixes.forEach((suffix) => {
            const p = lookupExpression.value
                ? `${props.filterName}_${suffix}__${lookupExpression.value}`
                : `${props.filterName}_${suffix}`;
            params.push(p);
        });
    }
    if (params.length > 0) {
        return params;
    }
    return lookupExpression.value ? `${props.filterName}__${lookupExpression.value}` : props.filterName;
});
const route = useRoute();

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
    if (!filters.length) {
        return "";
    }
    return filters
        .map((filter) => {
            const filterValue = filter.value;
            let labelValue = filter.labelValue;
            if (filter.is_range && lookupExpressionsToParams.value.length) {
                const keys = Object.keys(filterValue);
                if (!labelValue) {
                    labelValue = {};
                    for (const key of keys) {
                        const value = filterValue[key];
                        if (!value) {
                            continue;
                        }
                        labelValue[key] = new Date(value).toISOString().split("T")[0];
                    }
                }
            } else if (labelValue === true) {
                const options = props.filterFormValues.options?.length
                    ? props.filterFormValues.options
                    : props.filterDetails.choices;
                if (isArray(filterValue)) {
                    labelValue = filterValue.map((option) =>
                        isArray(options) ? options.find((choice) => choice.value === option)?.label : "",
                    );
                } else {
                    labelValue = isArray(options) ? options.find((choice) => choice.value == filterValue)?.label : "";
                }
            }
            labelValue = labelValue ?? filter.value;
            if (isArray(labelValue)) {
                return labelValue.join(",");
            } else if (isObject(labelValue)) {
                if (filter.is_range) {
                    const keys = Object.keys(labelValue);
                    if (keys.length === 2) {
                        return `${labelValue[keys[0]] ?? ""} - ${labelValue[keys[1]] ?? ""}`;
                    } else if (keys.length === 1) {
                        return `${keys[0]}: ${labelValue[keys[0]] ?? ""}`;
                    }
                    return "";
                }
                return Object.keys(labelValue)
                    .map((key) => {
                        return `${key}: ${labelValue[key]}`;
                    })
                    .join(", ");
            } else {
                return `${labelValue}`;
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

const onApplyFilter = (e) => {
    if (e && e.preventDefault) {
        e.preventDefault();
    }
    applyFilter();
};

const applyFilter = () => {
    // TODO: this now handle handles with single lookup expression
    //TODO: This is kinda hard coded for dates only
    const filter = props.filterFormValues;
    const filterValue = filter.value;
    if (filter.range && isObject(filterValue)) {
        Object.entries(filterValue).forEach(([key, value]) => {
            if (value instanceof Date) {
                filterValue[key] = value.toISOString().split("T")[0];
            }
        });
    }
    const filterObject = {
        field: filter.name,
        isValueRawObject: filter.isValueRawObject,
        expression: lookupExpression,
        param: lookupExpressionsToParams.value,
        value: filterValue,
        labelValue: filter.labelValue,
        is_range: filter.range,
    };
    if (!addedFilters.value.some((f) => f.field === filter.name)) {
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

watch(
    [toRef(props, "filterFormValues"), () => route.query],
    ([newFormValue, newQuery], [oldFormValues, oldQuery]) => {
        if (isEqual(newFormValue, oldFormValues) && isEqual(newQuery, oldQuery)) {
            return;
        }
        if (!isEqual(newQuery, props.listArgs)) {
            let queryHasFilter = false;
            if (isArray(lookupExpressionsToParams.value)) {
                lookupExpressionsToParams.value.forEach((param) => {
                    if (newQuery[param]) {
                        queryHasFilter = true;
                    }
                });
            } else if (newQuery[lookupExpressionsToParams.value]) {
                queryHasFilter = true;
            }
            if (queryHasFilter) {
                applyFilter();
            }
        }
    },
    { deep: true, immediate: true },
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
                :apply-filter="onApplyFilter"
                :class="theme('formPopover')"
                :filter-details="filterDetails"
                :filter-name="filterName"
                :has-filter-value="hasFilterValue"
            >
                <slot
                    :apply-filter="onApplyFilter"
                    :filter-details="filterDetails"
                    :filter-name="filterName"
                    :has-filter-value="hasFilterValue"
                    :name="resolvedSlotNames.form.name"
                />
            </Popover>
        </slot>
    </div>
</template>
