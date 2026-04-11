<script setup>
import FieldRenderer from "@vueda/components/FieldRenderer.vue";
import ControlButton from "@vueda/controls/button/ControlButton.vue";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { useTheme } from "@vueda/use/useTheme.js";
import { FilterModelSymbol, FormContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject, useSlots } from "vue";

/**
 * Renders the body of a filter popover for a single filterable field. It
 * displays a heading, the appropriate field widget via `FieldRenderer`, and an
 * Apply button that submits the filter value back to the parent
 * `FilterComponent`.
 */
defineOptions({});

const props = defineProps({
    /** Field name this form filters on, used to look up the field renderer and slot names. */
    filterName: {
        type: String,
        required: true,
    },
    /** Human-readable label displayed in the form heading. */
    filterLabel: {
        type: String,
        required: true,
    },
    /** Callback invoked when the user submits the filter form. */
    applyFilter: {
        type: Function,
        required: true,
    },
    /** When true, indicates an active filter value is set for this field. */
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
            <!-- @slot [filter-form-header, filter-form-header(filterName)] Header area at the top of the filter form. -->
            <slot :name="resolvedSlotNames.header.name" :class="theme('heading')" :filter-label="filterLabel">
                <h1 :class="theme('heading')">Filter by {{ filterLabel }}</h1>
            </slot>
            <field-renderer :form-model="filterModel" :form-model-name="filterName" :is-filter="true">
                <template v-for="slotName in remainingSlotNames" #[slotName]="slotProps">
                    <slot :name="slotName" v-bind="slotProps" />
                </template>
            </field-renderer>
            <!-- @slot [filter-form-submit-button, filter-form-submit-button(filterName)] Submit button for the filter form. -->
            <slot
                label="Apply"
                :filter-name="filterName"
                :has-filter-value="hasFilterValue"
                :name="resolvedSlotNames.submitButton.name"
                :disabled="formContext.state.anyError"
                :modified="formContext.state.anyModified"
            >
                <ControlButton type="submit" size="sm" :disabled="formContext.state.anyError">Apply</ControlButton>
            </slot>
        </div>
    </form>
</template>
