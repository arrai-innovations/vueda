<script setup>
import { useLoadingError } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FormChores from "@vueda/components/FormChores.vue";
import FieldString from "@vueda/fields/FieldString.vue";
import useFilterForm from "@vueda/use/useFilterForm.js";
import { useForm } from "@vueda/use/useForm.js";
import { useModelFilterInitialValues } from "@vueda/use/useModelInitialValues.js";
import { useTheme } from "@vueda/use/useTheme.js";
import { NON_FIELD_ERRORS_KEY } from "@vueda/utils/constants.js";
import { filterExpressions } from "@vueda/utils/filterLookups.js";
import WidgetRadio from "@vueda/widgets/WidgetRadio.vue";
import { isObject } from "lodash-es";
import isArray from "lodash-es/isArray.js";
import isEqual from "lodash-es/isEqual.js";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import { useToast } from "primevue/usetoast";
import { computed, nextTick, ref, toRaw, toRef, unref, watch } from "vue";

const listArgs = defineModel({
    type: Object,
    required: true,
});
const props = defineProps({
    app: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    view: {
        type: String,
        default: undefined,
    },
    filterables: {
        type: Array,
        default: undefined,
        description: "A list of the filterables to show in the filter form.",
    },
    filterableDetails: {
        type: Object,
        default: undefined,
        description: "A dictionary of overriding filterable details.",
    },
});
const filterForm = useFilterForm(props);

const showFilters = ref(false);
const addFilters = () => {
    showFilters.value = true;
};
// we keep more information about the selected filter for ourselves.
// We only mirror the added filter's key values into `listArgs`
const addedFilters = ref([]);
const modelInitialValues = useModelFilterInitialValues(toRef(props, "app"), toRef(props, "model"));

const formContext = useForm({
    initialValues: {
        filterField: null,
        lookupExpression: null,
        ...modelInitialValues,
    },
});
const loadingError = useLoadingError();
const promises = {
    submit: null,
};
const toast = useToast();
const convertObjectToString = (obj) => {
    return Object.entries(obj)
        .filter((entry) => entry[1] !== null && entry[1] !== undefined)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");
};
const formatDateTime = (value, isDate, isTime) => {
    if (isDate && isTime) {
        return new Date(value).toLocaleString();
    } else if (isDate) {
        return new Date(value).toLocaleDateString();
    } else if (isTime) {
        return new Date(value).toLocaleTimeString();
    }
    return value;
};
const confirmAddField = async () => {
    if (promises.submit) {
        return promises.submit;
    }
    try {
        // start 'submitting' right away, makes it useful for disabling the submit button.
        loadingError.clearError();
        loadingError.setLoading();
        // set all fields as touched to show errors
        formContext.setAllTouched();
        // wait for validation watchers to run
        await nextTick();
        if (!formContext.state.anyModified) {
            toast.add({
                severity: "info",
                summary: "No Changes Detected",
                detail: "Please modify the fields before submitting.",
                life: 10000,
            });
            return;
        }
        if (formContext.state.anyError) {
            // we don't submit to a server, so all errors must be cleared client-side
            const plural = Object.keys(formContext.state.errors).length > 1;
            toast.add({
                severity: "warn",
                summary: "Submission Blocked",
                detail: `Please correct the highlighted error${plural ? "s" : ""}.`,
                life: 10000,
            });
            return;
        }
        // label is a nice version of the value.
        const key = `${formContext.state.values.filterField}__${formContext.state.values.lookupExpression}`;
        let label = formContext.state.values[key];
        const fieldClass = filterForm.filterableDetails[formContext.state.values.filterField].typeFilter;
        const isDate = fieldClass.includes("Date");
        const isTime = fieldClass.includes("Time");
        const isRange = fieldClass.includes("Range");

        if (isRange) {
            for (const key in label) {
                label[key] = formatDateTime(label[key], isDate, isTime);
            }
            label = convertObjectToString(label);
        } else {
            label = formatDateTime(label, isDate, isTime);
            if (isObject(label)) {
                label = convertObjectToString(label);
            }
        }
        addedFilters.value.push({
            field: {
                name: formContext.state.values.filterField,
                ...filterForm.filterableDetails[formContext.state.values.filterField],
            },
            expression: filterExpressions.find((e) => e.value === formContext.state.values.lookupExpression),
            param: selectedFilterableOption.value.lookupExpressionsToParams[formContext.state.values.lookupExpression],
            value: formContext.state.values[key],
            label: `${filterForm.filterableDetails[formContext.state.values.filterField].label}:${
                selectedFilterableOption.value?.lookupExpressionsToParams?.length > 1
                    ? filterExpressions.find((e) => e.value === formContext.state.values.lookupExpression).label + ":"
                    : ""
            }${label}`,
        });
        showFilters.value = false;
    } catch (e) {
        // errors here are outside the normal course for expected errors
        loadingError.setError(e);
    } finally {
        loadingError.clearLoading();
        promises.submit = null;
    }
};
const removeFilter = (filter) => {
    addedFilters.value = addedFilters.value.filter((f) => {
        return !(
            f.field.name === filter.field.name &&
            f.expression.value === filter.expression.value &&
            f.value === filter.value
        );
    });
};
watch(
    addedFilters,
    (newAddedFilters) => {
        const desiredListArgs = {};
        for (const filter of newAddedFilters) {
            if (isArray(filter.param)) {
                filter.param.forEach((p) => {
                    if (isObject(filter.value)) {
                        const parts = p.split("_");
                        const key = parts[parts.length - 1];
                        desiredListArgs[p] = filter.value[key] ?? "";
                    } else {
                        desiredListArgs[p] = filter.value;
                    }
                });
                continue;
            }
            desiredListArgs[`${filter.param}`] = filter.value;
        }
        if (!isEqual(desiredListArgs, listArgs.value)) {
            listArgs.value = desiredListArgs;
        }
    },
    {
        deep: true,
    },
);
const selectedFilterableOption = computed(() => {
    return filterForm.filterableOptions.find((o) => o.value === formContext.state.values.filterField);
});
const computedLookupExpressionOptions = computed(() => {
    return Object.keys(selectedFilterableOption.value?.lookupExpressionsToParams || {}).map((value) => {
        return filterExpressions.find((e) => e.value === value);
    });
});
watch(
    () => toRaw(unref(computedLookupExpressionOptions)),
    (newLookupExprs, oldLookupExprs) => {
        if (!isEqual(newLookupExprs, oldLookupExprs)) {
            if (newLookupExprs.length === 1) {
                formContext.updateValue("lookupExpression", newLookupExprs[0].value);
            } else {
                formContext.updateValue("lookupExpression", null);
            }
        }
    },
    {
        immediate: true,
    },
);
const displayedFieldComponent = computed(() => {
    return unref(
        filterForm.fieldComponents[
            `${formContext.state.values.filterField}__${formContext.state.values.lookupExpression}`
        ],
    );
});
const displayedFieldProps = computed(() => {
    return unref(
        filterForm.fieldProps[`${formContext.state.values.filterField}__${formContext.state.values.lookupExpression}`],
    );
});
const displayedWidgetComponent = computed(() => {
    return unref(
        filterForm.widgetComponents[
            `${formContext.state.values.filterField}__${formContext.state.values.lookupExpression}`
        ],
    );
});
const displayedWidgetProps = computed(() => {
    return unref(
        filterForm.widgetProps[`${formContext.state.values.filterField}__${formContext.state.values.lookupExpression}`],
    );
});
const theme = useTheme("FilterForm", props);
</script>

<template>
    <Dialog v-model:visible="showFilters" :class="theme('dialog')" header="Add Filter" modal>
        <error-display
            :class="theme('errorDisplay')"
            :error="unref(loadingError.error)"
            :errored="unref(loadingError.errored)"
            while-text="adding a filter field"
        />
        <form :class="theme('form')" @submit.prevent="confirmAddField">
            <form-chores help="Select a filter field & expression and set a filter value." :name="NON_FIELD_ERRORS_KEY">
                <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                    <slot :name="slot" v-bind="slotProps || {}" />
                </template>
            </form-chores>
            <hr :class="theme('hr')" />
            <div :class="theme('fieldContainer')">
                <field-string :class="theme('fieldLabel')" label="Filter Field" name="filterField" required>
                    <widget-radio :class="theme('fieldInput')" :options="filterForm.filterableOptions" />
                    <form-chores>
                        <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                            <slot :name="slot" v-bind="slotProps || {}" />
                        </template>
                    </form-chores>
                </field-string>
            </div>
            <div :class="theme('fieldContainer')">
                <field-string :class="theme('fieldLabel')" label="Lookup Expression" name="lookupExpression" required>
                    <widget-radio
                        :class="theme('fieldInput')"
                        option-label="label"
                        option-value="value"
                        :options="computedLookupExpressionOptions"
                    />
                    <form-chores>
                        <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                            <slot :name="slot" v-bind="slotProps || {}" />
                        </template>
                    </form-chores>
                </field-string>
            </div>
            <div :class="theme('fieldContainer')">
                <component
                    :is="displayedFieldComponent"
                    v-if="displayedFieldComponent"
                    v-bind="displayedFieldProps"
                    :class="theme('fieldLabel')"
                    label="Filter Value"
                    required
                >
                    <component
                        :is="displayedWidgetComponent"
                        v-if="displayedWidgetComponent"
                        :class="theme('fieldInput')"
                        v-bind="displayedWidgetProps"
                    />
                    <form-chores>
                        <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                            <slot :name="slot" v-bind="slotProps || {}" />
                        </template>
                    </form-chores>
                </component>
            </div>
            <div :class="theme('createButtonContainer')">
                <slot label="Add Field" name="button" type="submit" verb="addFilter">
                    <Button :class="theme('submitButton')" label="Add Field" severity="secondary" type="submit" />
                </slot>
            </div>
        </form>
    </Dialog>
    <div :class="theme('filterListContainer')">
        <template v-if="filterForm.filterableOptions?.length">
            <slot label="Add Filter" name="button" verb="addFilter" @click="addFilters">
                <Button :class="theme('filterButton')" label="Add Filter" severity="secondary" @click="addFilters" />
            </slot>
        </template>
        <template v-for="filter in addedFilters" :key="filter.field">
            <slot
                :label="filter.label"
                name="button"
                severity="info"
                :title="`Remove filter for ${filter.field.label} by ${filter.expression.label} for ${filter.value}`"
                verb="removeFilter"
                v-bind="filter"
                @click="() => removeFilter(filter)"
            >
                <Button
                    :class="theme('filterButton')"
                    :label="filter.label"
                    severity="info"
                    :title="`Remove filter for ${filter.field.label} by ${filter.expression.label} for ${filter.value}`"
                    @click="removeFilter(filter)"
                />
            </slot>
        </template>
    </div>
</template>

<style scoped></style>
