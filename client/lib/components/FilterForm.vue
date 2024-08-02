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
import { computed, nextTick, ref, unref, watch } from "vue";

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
    filterFields: {
        type: Array,
        default: () => [],
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
        filterExpression: null,
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
            field: filterForm.filterFields.find((f) => f.name === formContext.state.values.filterField),
            expression: filterExpressions.find((e) => e.value === formContext.state.values.filterExpression),
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
    () => {
        const desiredListArgs = {};
        for (const filter of addedFilters.value) {
            desiredListArgs[`${filter.field.name}__${filter.expression.value}`] = filter.value;
        }
        if (!isEqual(desiredListArgs, listArgs.value)) {
            listArgs.value = desiredListArgs;
        }
    },
    {
        deep: true,
    },
);
const computedFilterExpressions = computed(() => {
    return filterExpressions.filter((e) => {
        return filterForm.filterFields.some((f) => {
            if (f.name === formContext.state.values.filterField) {
                return f.filters.some((filter) => {
                    return filter.lookupExprs.includes(e.value);
                });
            }
        });
    });
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
                    <widget-radio option-label="labelVerbose" option-value="name" :options="filterForm.filterFields" />
                    <form-chores>
                        <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                            <slot :name="slot" v-bind="slotProps || {}" />
                        </template>
                    </form-chores>
                </field-string>
            </div>
            <div>
                <field-string label="Filter Expression" name="filterExpression" required>
                    <widget-radio option-label="label" option-value="value" :options="computedFilterExpressions" />
                    <form-chores>
                        <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                            <slot :name="slot" v-bind="slotProps || {}" />
                        </template>
                    </form-chores>
                </field-string>
            </div>
            <div>
                <component
                    :is="
                        filterForm.fieldComponents[
                            `${formContext.state.values.filterField}__${formContext.state.values.filterExpression}`
                        ]
                    "
                    v-if="
                        filterForm.fieldComponents[
                            `${formContext.state.values.filterField}__${formContext.state.values.filterExpression}`
                        ]
                    "
                    v-bind="
                        filterForm.fieldProps[
                            `${formContext.state.values.filterField}__${formContext.state.values.filterExpression}`
                        ]
                    "
                    label="Filter Value"
                    name="filterValue"
                    required
                >
                    <component
                        :is="
                            filterForm.widgetComponents[
                                `${formContext.state.values.filterField}__${formContext.state.values.filterExpression}`
                            ]
                        "
                        v-if="
                            filterForm.widgetComponents[
                                `${formContext.state.values.filterField}__${formContext.state.values.filterExpression}`
                            ]
                        "
                        v-bind="
                            filterForm.widgetProps[
                                `${formContext.state.values.filterField}__${formContext.state.values.filterExpression}`
                            ]
                        "
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
    <div class="flex gap-1 lg:gap-2 my-1 items-center w-full">
        <slot :click="addFilters" label="Add Filter" name="button" verb="addFilter">
            <Button class="whitespace-nowrap" label="Add Filter" severity="secondary" @click="addFilters" />
        </slot>
        <div class="flex gap-2">
            <template v-for="filter in addedFilters" :key="filter.field">
                <slot
                    :click="() => removeFilter(filter)"
                    :label="`${filter.field.label} by ${filter.expression.label} for ${filter.value}`"
                    name="filter"
                    v-bind="filter"
                >
                    <Button
                        :label="`${filter.field.label} by ${filter.expression.label} for ${filter.value}`"
                        severity="info"
                        @click.prevent="removeFilter(filter)"
                    />
                </slot>
            </template>
        </div>
    </div>
</template>

<style scoped></style>
