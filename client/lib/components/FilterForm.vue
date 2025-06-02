<script setup>
import FieldRenderer from "@vueda/components/FieldRenderer.vue";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { useTheme } from "@vueda/use/useTheme.js";
import { FilterModelSymbol, FormContextSymbol } from "@vueda/utils/symbols.js";
import Button from "primevue/button";
import { computed, inject, useSlots } from "vue";

const props = defineProps({
    filterName: {
        type: String,
        required: true,
    },
    filterLabel: {
        type: String,
        required: true,
    },
    applyFilter: {
        type: Function,
        required: true,
    },
    hasFilterValue: {
        type: Boolean,
        default: false,
    },
});
const filterModel = inject(FilterModelSymbol);
const formContext = inject(FormContextSymbol);

const theme = useTheme("FilterForm", props);
const slots = useSlots();
const resolvedSlotNamesArgs = {
    submitButton: computed(() => [`filter-form-submit-button(${props.filterName})`, "filter-form-submit-button"]),
    header: computed(() => [`filter-form-header(${props.filterName})`, "filter-form-header"]),
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
</script>

<template>
    <form @submit.prevent="applyFilter">
        <div :class="theme('outer')">
            <slot :name="resolvedSlotNames.header.name" :class="theme('heading')" :filterLabel="filterLabel">
                <h1 :class="theme('heading')">Filter by {{ filterLabel }}</h1>
            </slot>
            <field-renderer :form-model="filterModel" :form-model-name="filterName" :is-filter="true">
                <template v-for="slotName in remainingSlotNames" #[slotName]="slotProps">
                    <slot :name="slotName" v-bind="slotProps" />
                </template>
            </field-renderer>
            <slot
                label="Apply"
                :filter-name="filterName"
                :has-filter-value="hasFilterValue"
                :name="resolvedSlotNames.submitButton.name"
                :disabled="formContext.state.anyError"
                :modified="formContext.state.anyModified"
            >
                <Button type="submit" label="Apply" size="small" :disabled="formContext.state.anyError" />
            </slot>
        </div>
    </form>
</template>
