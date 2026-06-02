<script setup>
import { assignReactiveObject, deepUnref } from "@arrai-innovations/reactive-helpers";
import FilterForm from "@vueda/components/FilterForm.vue";
import ButtonGroup from "@vueda/controls/button-group/ButtonGroup.vue";
import Button from "@vueda/controls/button/Button.vue";
import Popover from "@vueda/shell/popover/Popover.vue";
import PopoverContent from "@vueda/shell/popover/PopoverContent.vue";
import { useFilterField } from "@vueda/use/useFilterForm.js";
import { useForm } from "@vueda/use/useForm.js";
import { useIcons } from "@vueda/use/useIcons.js";
import { useModelChoices } from "@vueda/use/useModelChoices.js";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { FilterModelSymbol } from "@vueda/utils/symbols.js";
import isEmpty from "lodash-es/isEmpty.js";
import isObject from "lodash-es/isObject.js";
import { computed, inject, reactive, ref, toRef, useSlots, watch } from "vue";

/**
 * Renders a single filterable field as a button-triggered popover. The button
 * displays the filter label and its current value; clicking it opens a
 * `FilterForm` popover where the user can set or clear the filter value.
 */
defineOptions({});

const props = defineProps({
    /** Field name used to identify this filter in query params and filter state. */
    filterName: {
        type: String,
        required: true,
    },
    /** Position of this filter component within the parent filter group. */
    index: {
        type: Number,
        required: true,
    },
    /** Configuration object for this filter, including label, choices, and lookup expressions. */
    filterDetails: {
        type: Object,
        required: true,
    },
    /** Current URL query parameters, used to derive the active filter value on load. */
    params: {
        type: Object,
        required: true,
    },
    /** Current URL query string object passed to pre-populate the filter value. */
    query: {
        type: Object,
        default: () => ({}),
    },
    /** When true, renders the filter button in an error state. */
    errored: {
        type: Boolean,
        default: false,
    },
    ...THEME_OVERRIDE_PROPS,
});
const filterContext = inject(FilterModelSymbol, null);

const lookupExpression = computed(() => {
    return props.filterDetails.ignorelookupExprs ? undefined : props.filterDetails.lookupExprs?.[0];
});
const lookupExpressionsToParams = computed(() => {
    const params = [];
    if (props.filterDetails.suffixes?.length) {
        props.filterDetails.suffixes.forEach((suffix) => {
            params.push(`${props.filterName}_${suffix}`);
        });
    }
    if (params.length > 0) {
        return params;
    }
    return props.filterName;
});

const queryValue = computed(() => {
    if (!props.query) {
        return undefined;
    }

    const paramKeys = lookupExpressionsToParams.value;

    if (Array.isArray(paramKeys)) {
        return paramKeys.reduce((acc, key) => {
            if (props.query[key]) {
                const parts = key.split("_");
                const suffix = parts[parts.length - 1];
                acc[suffix] = props.query[key];
            }
            return acc;
        }, {});
    }

    return props.query[paramKeys];
});

const formState = useFilterField(props, queryValue);
const formContext = useForm({
    initialValues: toRef(formState, "initialValues"),
});

// TODO: this is built assuming each filter field has only one lookup expression
const emit = defineEmits(["hide-filter-form"]);
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
const remainingSlotNames = computed(() => {
    const slotNames = Object.keys(slots);
    return slotNames.filter(
        (slotName) => !Object.values(resolvedSlotNames).some((resolver) => resolver.name === slotName),
    );
});

const doToggle = (event) => {
    if (event) {
        event.preventDefault();
    }
    internalShowState.value = !internalShowState.value;
};

const filterFormValue = computed(() => formContext.state?.submittingValues?.[props.filterName]);
const modelChoices = useModelChoices({
    [props.filterName]: {
        app: toRef(filterContext, "app"),
        model: toRef(filterContext, "model"),
        intendToFetch: computed(
            () => props.filterDetails.choices === true && (queryValue.value || internalShowState.value),
        ),
        isFilter: true,
    },
});
const displayFilterValue = computed(() => {
    const filters = addedFilters.value.filter((filter) => filter.field === props.filterName);
    if (!filters.length) {
        return "";
    }
    return filters
        .map((filter) => {
            let labelValue;
            if (props.filterDetails.choices) {
                let options = props.filterDetails.choices;
                if (options === true) {
                    options = modelChoices.choices?.[props.filterName]?.results || [];
                }
                if (Array.isArray(filter.value)) {
                    labelValue = filter.value.map((option) =>
                        Array.isArray(options)
                            ? (options.find((choice) => choice.value === option)?.label ?? "unknown")
                            : "",
                    );
                } else {
                    /* eslint-disable eqeqeq */
                    // noinspection EqualityComparisonWithCoercionJS
                    labelValue = Array.isArray(options)
                        ? (options.find((choice) => choice.value == filter.value)?.label ?? "unknown")
                        : "";
                    /* eslint-enable eqeqeq */
                }
            }
            labelValue = labelValue ?? filter.value;
            if (Array.isArray(labelValue)) {
                return labelValue.join(",");
            } else if (isObject(labelValue)) {
                if (filter.range) {
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

    const filterObject = deepUnref({
        field: props.filterName,
        expression: lookupExpression,
        param: lookupExpressionsToParams.value,
        value: filterFormValue.value,
        range: formState.range,
    });

    if (!addedFilters.value.some((f) => f.field === props.filterName)) {
        if (isEmpty(filterFormValue.value)) {
            return;
        }

        addedFilters.value.push(filterObject);
    } else {
        if (isEmpty(filterFormValue.value) || (formState.range && isRangeObjectEmpty(filterFormValue))) {
            removeFilter();
        }

        assignReactiveObject(
            addedFilters,
            addedFilters.value.map((f) => {
                if (f.field === props.filterName) {
                    return filterObject;
                }
                return f;
            }),
        );
    }
    internalShowState.value = false;
    emit("hide-filter-form", props.filterName);
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
        errored: toRef(props, "errored"),
    }),
);
const icon = useIcons("FilterComponent");

watch(
    toRef(formState, "initialValues"),
    (newInitialValues) => {
        const newValue = newInitialValues?.[props.filterName];
        if (newValue && !isEmpty(newValue)) {
            applyFilter();
        } else {
            removeFilter();
        }
    },
    { deep: true, immediate: true },
);
</script>

<template>
    <div :style="theme.hideStyle?.value">
        <ButtonGroup>
            <!-- @slot [filter-clear-button, filter-clear-button(filterName)] Replaces the clear-filter button shown when a filter value is active. -->
            <slot
                :class="theme('clearButton')"
                :do-toggle="doToggle"
                :filter-details="filterDetails"
                :filter-name="filterName"
                :has-filter-value="hasFilterValue"
                :label="computedFilterLabel"
                :name="resolvedSlotNames.clearButton.name"
                :remove-filter="removeFilter"
                variant="outline"
                :show-state="internalShowState"
            >
                <Button v-if="hasFilterValue" variant="outline" size="sm" @click.prevent="removeFilter">
                    <!-- @slot [filter-clear-button-icon, filter-clear-button-icon(filterName)] Icon inside the clear-filter button. -->
                    <slot
                        :filter-details="filterDetails"
                        :filter-name="filterName"
                        :has-filter-value="hasFilterValue"
                        :name="resolvedSlotNames.clearButtonIcon.name"
                        :remove-filter="removeFilter"
                        :show-state="internalShowState"
                    >
                        <component
                            :is="icon('close').component"
                            v-if="icon('close')"
                            v-bind="icon('close').props"
                            aria-hidden="true"
                        />
                    </slot>
                </Button>
            </slot>
            <!-- @slot [filter-dropdown-button, filter-dropdown-button(filterName)] Replaces the dropdown trigger button for this filter. -->
            <slot
                :class="theme('dropdownButton')"
                :filter-details="filterDetails"
                :filter-name="filterName"
                :has-filter-value="hasFilterValue"
                :label="computedFilterLabel"
                :name="resolvedSlotNames.dropdownButton.name"
                :remove-filter="removeFilter"
                variant="outline"
                :show-state="internalShowState"
                @click="doToggle"
            >
                <Button :class="theme('dropdownButton')" variant="outline" size="sm" @click="doToggle">
                    <!-- @slot [filter-dropdown-button-icon, filter-dropdown-button-icon(filterName)] Icon inside the dropdown button, shown when no filter value is set. -->
                    <slot
                        v-if="!hasFilterValue"
                        :filter-details="filterDetails"
                        :filter-name="filterName"
                        :has-filter-value="hasFilterValue"
                        :name="resolvedSlotNames.dropdownButtonIcon.name"
                        :remove-filter="removeFilter"
                        :show-state="internalShowState"
                    >
                        <component
                            :is="icon('plus').component"
                            v-if="icon('plus')"
                            v-bind="icon('plus').props"
                            aria-hidden="true"
                        />
                    </slot>
                    <!-- @slot [filter-dropdown-button-label, filter-dropdown-button-label(filterName)] Label text inside the dropdown button. -->
                    <slot
                        :filter-details="filterDetails"
                        :filter-name="filterName"
                        :has-filter-value="hasFilterValue"
                        :label="computedFilterLabel"
                        :name="resolvedSlotNames.dropdownButtonLabel.name"
                        :show-state="internalShowState"
                    >
                        <span>{{ computedFilterLabel }}</span>
                    </slot>
                    <!-- @slot [filter-dropdown-button-suffix, filter-dropdown-button-suffix(filterName)] Suffix indicator (expand/collapse arrow) inside the dropdown button. -->
                    <slot
                        :filter-details="filterDetails"
                        :filter-name="filterName"
                        :has-filter-value="hasFilterValue"
                        :label="computedFilterLabel"
                        :name="resolvedSlotNames.dropdownButtonSuffix.name"
                        :show-state="internalShowState"
                    >
                        <template v-if="hasFilterValue">
                            <component
                                :is="icon('caretUp').component"
                                v-if="internalShowState && icon('caretUp')"
                                v-bind="icon('caretUp').props"
                                aria-hidden="true"
                            />
                            <component
                                :is="icon('caretDown').component"
                                v-else-if="icon('caretDown')"
                                v-bind="icon('caretDown').props"
                                aria-hidden="true"
                            />
                        </template>
                    </slot>
                </Button>
            </slot>
        </ButtonGroup>
        <!-- @slot [filter-form-popover, filter-form-popover(filterName)] Replaces the popover element that wraps the filter form. -->
        <slot
            :class="theme('formPopover')"
            :filter-details="filterDetails"
            :filter-name="filterName"
            :has-filter-value="hasFilterValue"
            :name="resolvedSlotNames.formPopover.name"
            :show-state="internalShowState"
        >
            <Popover v-model:open="internalShowState">
                <PopoverContent :class="theme('formPopover')">
                    <!-- @slot [filter-form, filter-form(filterName)] Replaces the filter form body inside the popover. -->
                    <slot
                        :apply-filter="onApplyFilter"
                        :filter-details="filterDetails"
                        :filter-name="filterName"
                        :has-filter-value="hasFilterValue"
                        :name="resolvedSlotNames.form.name"
                    >
                        <FilterForm
                            :filter-name="filterName"
                            :filter-label="props.filterDetails.label ?? props.filterName"
                            :apply-filter="onApplyFilter"
                            :has-filter-value="hasFilterValue"
                        >
                            <template v-for="slotName in remainingSlotNames" #[slotName]="slotProps">
                                <slot :name="slotName" v-bind="slotProps || {}" />
                            </template>
                        </FilterForm>
                    </slot>
                </PopoverContent>
            </Popover>
        </slot>
    </div>
</template>
