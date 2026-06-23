<script setup>
import { assignReactiveObject, deepUnref } from "@arrai-innovations/reactive-helpers";
import FilterForm from "@vueda/components/FilterForm.vue";
import Button from "@vueda/controls/button/Button.vue";
import "@vueda/theme/vueda-tailwind/form/FilterFieldForm.theme.js";
import { getFilterParams, getFilterQueryValue, useFilterField } from "@vueda/use/useFilterForm.js";
import { useForm } from "@vueda/use/useForm.js";
import { useModelChoices } from "@vueda/use/useModelChoices.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { FilterModelSymbol } from "@vueda/utils/symbols.js";
import isEmpty from "lodash-es/isEmpty.js";
import { computed, inject, reactive, toRef, useSlots } from "vue";

/**
 * Renders and controls the filter form for a single filterable field. It hosts
 * the per-field form state (initial values seeded from the URL query, validation,
 * and lazy choice fetching) and applies or removes the field's entry in the
 * shared active-filter list. It is mounted on demand inside the {@api vue:component:FilterMenu}
 * drill-in (to add a filter) and inside a {@api vue:component:FilterChip} edit
 * popover (to edit one). The surrounding popover owns visibility; this component
 * owns the form body and the apply/remove mutations.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Field name this form filters on. */
    filterName: {
        type: String,
        required: true,
    },
    /** Filter configuration for this field (label, typeFilter, choices, lookupExprs, suffixes). */
    filterDetails: {
        type: Object,
        required: true,
    },
    /** Current URL query object, used to seed the field value when editing an active filter. */
    query: {
        type: Object,
        default: () => ({}),
    },
    /** When true, the form is visible; gates lazy choice fetching for choice fields. */
    open: {
        type: Boolean,
        default: true,
    },
    /** When true, renders a Remove control beside Apply (used by the chip edit popover). */
    showRemove: {
        type: Boolean,
        default: false,
    },
    /** When true, renders the field in an error state. */
    errored: {
        type: Boolean,
        default: false,
    },
});

/** The shared active-filter list; entries are added/updated/removed here. */
const addedFilters = defineModel({
    type: Array,
    required: true,
});
const emit = defineEmits(["applied", "removed", "hide-filter-form"]);

const filterContext = inject(FilterModelSymbol, null);

const lookupExpression = computed(() =>
    props.filterDetails.ignorelookupExprs ? undefined : props.filterDetails.lookupExprs?.[0],
);
const queryValue = computed(() => getFilterQueryValue(props.filterName, props.filterDetails, props.query));

const formState = useFilterField(props, queryValue);
const formContext = useForm({ initialValues: toRef(formState, "initialValues") });
const filterFormValue = computed(() => formContext.state?.submittingValues?.[props.filterName]);

useModelChoices({
    [props.filterName]: {
        app: toRef(filterContext, "app"),
        model: toRef(filterContext, "model"),
        intendToFetch: computed(() => props.filterDetails.choices === true && (queryValue.value || props.open)),
        isFilter: true,
    },
});

const hasFilterValue = computed(() => addedFilters.value.some((filter) => filter.field === props.filterName));

const isRangeObjectEmpty = (rangeObject) => Object.values(rangeObject).every((value) => !value);

const removeFilter = () => {
    assignReactiveObject(
        addedFilters,
        addedFilters.value.filter((filter) => filter.field !== props.filterName),
    );
};

const applyFilter = () => {
    const filterObject = deepUnref({
        field: props.filterName,
        expression: lookupExpression,
        param: getFilterParams(props.filterName, props.filterDetails),
        value: filterFormValue.value,
        range: formState.range,
    });

    if (!addedFilters.value.some((filter) => filter.field === props.filterName)) {
        if (isEmpty(filterFormValue.value)) {
            return;
        }
        addedFilters.value.push(filterObject);
    } else {
        if (isEmpty(filterFormValue.value) || (formState.range && isRangeObjectEmpty(filterFormValue))) {
            removeFilter();
        } else {
            assignReactiveObject(
                addedFilters,
                addedFilters.value.map((filter) => (filter.field === props.filterName ? filterObject : filter)),
            );
        }
    }
    emit("applied", props.filterName);
    emit("hide-filter-form", props.filterName);
};

const onApplyFilter = (event) => {
    if (event && event.preventDefault) {
        event.preventDefault();
    }
    applyFilter();
};

const onRemove = () => {
    removeFilter();
    emit("removed", props.filterName);
    emit("hide-filter-form", props.filterName);
};

const theme = useTheme(
    "FilterFieldForm",
    props,
    reactive({
        hasFilterValue,
        errored: toRef(props, "errored"),
        showRemove: toRef(props, "showRemove"),
    }),
);

const slots = useSlots();
// The submit row is owned here (Remove + Apply); forward every other consumer
// slot through to FilterForm / FieldRenderer untouched.
const passThroughSlots = computed(() => Object.keys(slots).filter((name) => name !== "filter-form-submit-button"));

defineExpose({ applyFilter, removeFilter, hasFilterValue });
</script>

<template>
    <FilterForm
        :filter-name="filterName"
        :filter-label="filterDetails.label ?? filterName"
        :apply-filter="onApplyFilter"
        :has-filter-value="hasFilterValue"
    >
        <template v-for="slotName in passThroughSlots" #[slotName]="slotProps">
            <slot :name="slotName" v-bind="slotProps || {}" />
        </template>
        <template #filter-form-submit-button="{ disabled }">
            <div :class="theme('actions')" data-qa="filter-field-form-actions">
                <Button
                    v-if="showRemove"
                    type="button"
                    variant="ghost"
                    size="sm"
                    :class="theme('remove')"
                    data-qa="filter-field-form-remove"
                    @click="onRemove"
                >
                    Remove
                </Button>
                <Button type="submit" variant="default" size="sm" :disabled="disabled" data-qa="filter-field-form-apply"
                    >Apply</Button
                >
            </div>
        </template>
    </FilterForm>
</template>
