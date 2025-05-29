<script setup>
import { assignReactiveObject, deepUnref } from "@arrai-innovations/reactive-helpers";
import FilterForm from "@vueda/components/FilterForm.vue";
import { useFilterField } from "@vueda/use/useFilterForm.js";
import { useForm } from "@vueda/use/useForm.js";
import { useModelChoices } from "@vueda/use/useModelChoices.js";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { FilterModelSymbol } from "@vueda/utils/symbols.js";
import isEmpty from "lodash-es/isEmpty.js";
import isObject from "lodash-es/isObject.js";
import Button from "primevue/button";
import ButtonGroup from "primevue/buttongroup";
import Popover from "primevue/popover";
import { computed, inject, reactive, ref, toRef, useSlots, useTemplateRef, watch } from "vue";

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
    params: {
        type: Object,
        required: true,
    },
    filterFormValues: {
        type: Object,
        default: undefined,
    },
    query: {
        type: Object,
        default: () => ({}),
    },
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
    if (!slots[resolvedSlotNames.formPopover.name] && popoverRef.value) {
        popoverRef.value.toggle(event);
    }
};

const filterFormValue = computed(() => {
    return props.filterFormValues ? props.filterFormValues.value : formContext.state.submittingValues[props.filterName];
});
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
                    labelValue = Array.isArray(options)
                        ? (options.find((choice) => choice.value == filter.value)?.label ?? "unknown")
                        : "";
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
    // TODO: This is kinda hard coded for dates only
    const filter = props.filterFormValues ?? formState;
    if (filter.range && isObject(filterFormValue.value)) {
        Object.entries(filterFormValue.value).forEach(([key, value]) => {
            if (value instanceof Date) {
                filterFormValue.value[key] = value.toISOString().split("T")[0];
            }
        });
    }
    const filterObject = deepUnref({
        field: props.filterName,
        expression: lookupExpression,
        param: lookupExpressionsToParams.value,
        value: filterFormValue.value,
        labelValue: filter.labelValue,
        range: filter.range,
    });
    if (!addedFilters.value.some((f) => f.field === props.filterName)) {
        if (isEmpty(filterFormValue.value)) {
            return;
        }
        addedFilters.value.push(filterObject);
    } else {
        if (isEmpty(filterFormValue.value) || (filter.range && isRangeObjectEmpty(filterFormValue))) {
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
        errored: toRef(props, "errored"),
    }),
);

watch(
    toRef(formState, "initialValues"),
    (newInitialValues) => {
        if (newInitialValues && !isEmpty(newInitialValues)) {
            applyFilter();
        } else {
            removeFilter();
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
            </Popover>
        </slot>
    </div>
</template>
