<script setup>
import FilterFieldForm from "@vueda/components/FilterFieldForm.vue";
import Popover from "@vueda/shell/popover/Popover.vue";
import PopoverContent from "@vueda/shell/popover/PopoverContent.vue";
import PopoverTrigger from "@vueda/shell/popover/PopoverTrigger.vue";
import "@vueda/theme/vueda-tailwind/form/FilterChip.theme.js";
import { useIcons } from "@vueda/use/useIcons.js";
import { useModelChoices } from "@vueda/use/useModelChoices.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { FilterModelSymbol } from "@vueda/utils/symbols.js";
import isObject from "lodash-es/isObject.js";
import { computed, inject, reactive, ref, toRef, useSlots } from "vue";

/**
 * Renders a single active filter as a removable pill. The label segment shows
 * the field name and its current value and opens the field's edit form in a
 * popover; the trailing segment removes the filter. The chip resolves choice
 * values to their human labels via {@api use:useModelChoices}, and turns
 * destructive when the server rejected the value.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** The active filter entry to render: `{ field, value, range, param }`. */
    filter: {
        type: Object,
        required: true,
    },
    /** Filter configuration for this field (label, choices, typeFilter, lookupExprs, suffixes). */
    filterDetails: {
        type: Object,
        required: true,
    },
    /** Current URL query, forwarded to the edit form so it seeds from the active value. */
    query: {
        type: Object,
        default: () => ({}),
    },
    /** When true, the server rejected this filter's value; the chip renders destructive. */
    errored: {
        type: Boolean,
        default: false,
    },
});

/** The shared active-filter list; the embedded form and the remove control mutate it. */
const addedFilters = defineModel({
    type: Array,
    required: true,
});
const emit = defineEmits(["hide-filter-form"]);

const filterContext = inject(FilterModelSymbol, null);
const filterName = computed(() => props.filter?.field);
const open = ref(false);

const modelChoices = useModelChoices({
    [props.filter.field]: {
        app: toRef(filterContext, "app"),
        model: toRef(filterContext, "model"),
        intendToFetch: computed(() => props.filterDetails.choices === true),
        isFilter: true,
    },
});

const label = computed(() => props.filterDetails.label ?? filterName.value);

const displayValue = computed(() => {
    const filter = props.filter;
    if (!filter) {
        return "";
    }
    let labelValue;
    if (props.filterDetails.choices) {
        let options = props.filterDetails.choices;
        if (options === true) {
            options = modelChoices.choices?.[filterName.value]?.results || [];
        }
        if (Array.isArray(filter.value)) {
            labelValue = filter.value.map((option) =>
                Array.isArray(options) ? (options.find((choice) => choice.value === option)?.label ?? "unknown") : "",
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
        return labelValue.join(", ");
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
            .map((key) => `${key}: ${labelValue[key]}`)
            .join(", ");
    }
    return `${labelValue}`;
});

const removeFilter = () => {
    addedFilters.value = addedFilters.value.filter((filter) => filter.field !== filterName.value);
};

const onHideFilterForm = (name) => {
    open.value = false;
    emit("hide-filter-form", name);
};

const theme = useTheme("FilterChip", props, reactive({ errored: toRef(props, "errored") }));
const icon = useIcons("FilterChip");
const slots = useSlots();
</script>

<template>
    <Popover v-model:open="open">
        <span :class="theme('root')" data-qa="filter-chip" :data-errored="errored ? 'true' : undefined">
            <PopoverTrigger as-child>
                <button
                    type="button"
                    :class="theme('label')"
                    :aria-label="`Edit filter: ${label}`"
                    data-qa="filter-chip-edit"
                >
                    <component
                        :is="icon('errored').component"
                        v-if="errored && icon('errored')"
                        v-bind="icon('errored').props"
                        aria-hidden="true"
                    />
                    <span>{{ label }}: {{ displayValue }}</span>
                </button>
            </PopoverTrigger>
            <span :class="theme('divider')" aria-hidden="true" />
            <button
                type="button"
                :class="theme('remove')"
                :aria-label="`Remove filter: ${label}`"
                data-qa="filter-chip-remove"
                @click="removeFilter"
            >
                <component
                    :is="icon('close').component"
                    v-if="icon('close')"
                    v-bind="icon('close').props"
                    aria-hidden="true"
                />
                <span v-else aria-hidden="true">&times;</span>
            </button>
        </span>
        <PopoverContent :class="theme('popover')" size="sm">
            <FilterFieldForm
                v-model="addedFilters"
                :filter-name="filter.field"
                :filter-details="filterDetails"
                :query="query"
                :errored="errored"
                :open="open"
                :show-remove="true"
                @hide-filter-form="onHideFilterForm"
            >
                <template v-for="(_, slot) in slots" #[slot]="slotProps">
                    <slot :name="slot" v-bind="slotProps || {}" />
                </template>
            </FilterFieldForm>
        </PopoverContent>
    </Popover>
</template>
