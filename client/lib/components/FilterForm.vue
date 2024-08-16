<script setup>
import { useLoadingError } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FormChores from "@vueda/components/FormChores.vue";
import FieldString from "@vueda/fields/FieldString.vue";
import useFilterForm from "@vueda/use/useFilterForm.js";
import { useForm } from "@vueda/use/useForm.js";
import { NON_FIELD_ERRORS_KEY } from "@vueda/utils/constants.js";
import { filterExpressions } from "@vueda/utils/filterLookups.js";
import WidgetRadio from "@vueda/widgets/WidgetRadio.vue";
import isEqual from "lodash-es/isEqual.js";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import { useToast } from "primevue/usetoast";
import { computed, nextTick, ref, toRaw, unref, watch } from "vue";

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
const formContext = useForm({
    initialValues: {
        filterField: null,
        lookupExpression: null,
        filterValue: null,
    },
});
const loadingError = useLoadingError();
const promises = {
    submit: null,
};
const toast = useToast();
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
        addedFilters.value.push({
            field: {
                name: formContext.state.values.filterField,
                ...filterForm.filterableDetails[formContext.state.values.filterField],
            },
            expression: filterExpressions.find((e) => e.value === formContext.state.values.lookupExpression),
            param: selectedFilterableOption.value.lookupExpressionsToParams[formContext.state.values.lookupExpression],
            value: formContext.state.values.filterValue,
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
        console.log("watching lookup expressions", newLookupExprs, oldLookupExprs);
        if (!isEqual(newLookupExprs, oldLookupExprs)) {
            if (newLookupExprs.length === 1) {
                console.log("updating lookup expression", newLookupExprs[0]);
                formContext.updateValue("lookupExpression", newLookupExprs[0].value);
            } else {
                console.log("clearing lookup expression");
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
</script>

<template>
    <Dialog v-model:visible="showFilters" class="w-64" header="Add Filter" modal>
        <error-display
            :error="unref(loadingError.error)"
            :errored="unref(loadingError.errored)"
            while-text="adding a filter field"
        />
        <form class="flex flex-col gap-2" @submit.prevent="confirmAddField">
            <form-chores :name="NON_FIELD_ERRORS_KEY">
                <template v-if="!$slots['field-help']" #field-help>
                    <p>Select a filter field & expression and set a filter value.</p>
                </template>
                <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                    <slot :name="slot" v-bind="slotProps || {}" />
                </template>
            </form-chores>
            <hr class="w-full flex-1 border-primary-300 dark:border-primary-600 border-t" />
            <div>
                <field-string label="Filter Field" name="filterField" required>
                    <widget-radio :options="filterForm.filterableOptions" />
                    <form-chores>
                        <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                            <slot :name="slot" v-bind="slotProps || {}" />
                        </template>
                    </form-chores>
                </field-string>
            </div>
            <div>
                <field-string label="Lookup Expression" name="lookupExpression" required>
                    <widget-radio
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
            <div>
                <component
                    :is="displayedFieldComponent"
                    v-if="displayedFieldComponent"
                    v-bind="displayedFieldProps"
                    label="Filter Value"
                    name="filterValue"
                    required
                >
                    <component
                        :is="displayedWidgetComponent"
                        v-if="displayedWidgetComponent"
                        v-bind="displayedWidgetProps"
                    />
                    <form-chores>
                        <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                            <slot :name="slot" v-bind="slotProps || {}" />
                        </template>
                    </form-chores>
                </component>
            </div>
            <div class="flex justify-end">
                <slot label="Add Field" name="button" type="submit" verb="addFilter">
                    <Button class="whitespace-nowrap" label="Add Field" severity="secondary" type="submit" />
                </slot>
            </div>
        </form>
    </Dialog>
    <div class="flex flex-wrap gap-1 w-full my-1">
        <slot label="Add Filter" name="button" verb="addFilter" @click="addFilters">
            <Button
                class="whitespace-nowrap grow sm:grow-0"
                label="Add Filter"
                severity="secondary"
                @click="addFilters"
            />
        </slot>
        <template v-for="filter in addedFilters" :key="filter.field">
            <slot
                :label="`${filter.field.label} by ${filter.expression.label} for ${filter.value}`"
                name="filter"
                v-bind="filter"
                @click.prevent="() => removeFilter(filter)"
            >
                <Button
                    class="grow sm:grow-0"
                    :label="`${filter.field.label} by ${filter.expression.label} for ${filter.value}`"
                    severity="info"
                    @click.prevent="removeFilter(filter)"
                />
            </slot>
        </template>
    </div>
</template>

<style scoped></style>
