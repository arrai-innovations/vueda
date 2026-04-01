<script setup>
import LinkModelView from "@vueda/components/LinkModelView.vue";
import {
    ControlCombobox,
    ControlComboboxAnchor,
    ControlComboboxEmpty,
    ControlComboboxGroup,
    ControlComboboxInput,
    ControlComboboxItem,
    ControlComboboxItemIndicator,
    ControlComboboxList,
    ControlComboboxTrigger,
    ControlComboboxViewport,
} from "@vueda/controls/combobox";
import { useComboboxSearch } from "@vueda/use/useComboboxSearch.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { cn } from "@vueda/utils/cn.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { CheckIcon, ChevronDownIcon } from "lucide-vue-next";
import { computed, inject } from "vue";

/**
 * A combobox widget supporting static options or API-backed search, single or multiple
 * selection, grouping, and read-only display. Replaces WidgetSearchableSelect,
 * WidgetAutoComplete, and WidgetMultiSelect.
 *
 * Provide either `options` (static mode) or both `app` and `model` (API mode).
 * The `multiple` prop works in both modes.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...WIDGET_PROPS,
    /** Static option array. When provided, filtering is handled client-side by Reka UI. */
    options: { type: Array, default: undefined },
    /** Django app label for the model to search (API mode). */
    app: { type: String, default: undefined },
    /** Django model name (API mode). */
    model: { type: String, default: undefined },
    /** Additional field names to include in each API result (API mode). */
    modelFields: { type: Array, default: () => [] },
    /** Field names to expand in each API result (API mode). */
    modelExpandFields: { type: Array, default: () => [] },
    /** Default ordering for API results (API mode). */
    modelOrdering: { type: Array, default: () => [] },
    /** Whether multiple values can be selected. */
    multiple: { type: Boolean, default: false },
    /** Field name on each option object to use as the displayed label in the search list. */
    optionLabel: { type: String, default: "formatted_name" },
    /** Field name on each option object to use as the submitted value (static mode). */
    optionValue: { type: String, default: "value" },
    /** Field name on each resolved object to display when the combobox is closed (API mode). */
    selectedOptionLabel: { type: String, default: "formatted_name" },
    /** Whether the widget is in read-only mode. */
    readonly: { type: Boolean, default: false },
    /** Placeholder text shown when no value is selected. */
    placeholder: { type: String, default: undefined },
    /** Extra query parameters merged into every API request (API mode). */
    extraParams: { type: Object, default: () => ({}) },
    /** Function returning additional parameters from field dependency values (API mode). */
    getExtraParams: { type: Function, default: undefined },
    /** Whether to group API results by a field (API mode). */
    grouped: { type: Boolean, default: false },
    /** Field name to group results by (API mode). Requires `grouped: true`. */
    groupBy: { type: String, default: undefined },
});

const emit = defineEmits([...WIDGET_EMITS]);

/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const widgetContext = useWidget(props, emit);

const isApiMode = computed(() => !!props.app && !!props.model);

const comboboxSearch = useComboboxSearch(props, widgetContext);

// Normalise the bound value so multiple mode always has an array.
const effectiveValue = computed({
    get: () => {
        if (props.multiple) {
            return widgetContext.state.combinedValue ?? [];
        }
        return widgetContext.state.combinedValue;
    },
    set: (val) => {
        widgetContext.state.combinedValue = val;
    },
});

const effectivePlaceholder = computed(
    () => props.placeholder ?? (isApiMode.value ? `Select a ${props.model}` : "Select an option"),
);

// Closed-state display label.
const closedStateLabel = computed(() => {
    const val = widgetContext.state.combinedValue;
    const isEmpty = val == null || val === "" || (Array.isArray(val) && val.length === 0);
    if (isEmpty) return null;

    if (props.multiple) {
        const count = Array.isArray(val) ? val.length : 1;
        if (!isApiMode.value && props.options) {
            const values = Array.isArray(val) ? val : [val];
            return values
                .map((v) => {
                    const opt = props.options.find((o) => o[props.optionValue] === v);
                    return opt ? opt[props.optionLabel] : String(v);
                })
                .join(", ");
        }
        return count === 1 ? "1 item selected" : `${count} items selected`;
    }

    if (!isApiMode.value && props.options) {
        const opt = props.options.find((o) => o[props.optionValue] === val);
        return opt ? opt[props.optionLabel] : val != null ? String(val) : null;
    }

    // API single: use resolved label from composable.
    const label = comboboxSearch.singleSelectedLabel;
    return label && label !== "\u00A0" ? label : null;
});

// Options passed to the item renderer.
const displayOptions = computed(() => {
    if (isApiMode.value) {
        return comboboxSearch.options;
    }
    return props.options ?? [];
});

const emptyMessage = computed(() => {
    if (isApiMode.value) return comboboxSearch.emptyMessage;
    return "No options available.";
});

const isGrouped = computed(() => isApiMode.value && comboboxSearch.isGrouped);

const handleOpenChange = (open) => {
    if (open) {
        widgetContext.focus();
        comboboxSearch.onOpen();
    } else {
        widgetContext.blur();
        comboboxSearch.onClose();
    }
};

const triggerClass = cn(
    "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground",
    "focus-visible:border-ring focus-visible:ring-ring/50",
    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
    "dark:bg-input/30 dark:hover:bg-input/50",
    "flex w-full h-9 items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm",
    "whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none",
    "focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
);
</script>
<template>
    <template v-if="props.readonly">
        <LinkModelView
            v-if="isApiMode"
            :app="app"
            :label="comboboxSearch.singleSelectedLabel"
            :model="model"
            :pk="widgetContext.state.combinedValue"
            view="update"
        />
        <span v-else>{{ closedStateLabel }}</span>
    </template>
    <ControlCombobox
        v-else
        v-model="effectiveValue"
        v-bind="$attrs"
        :disabled="widgetContext.state.disabled"
        :multiple="props.multiple"
        :name="widgetContext.state.combinedName"
        :required="widgetContext.state.required"
        :reset-search-term-on-select="true"
        @update:open="handleOpenChange"
    >
        <ControlComboboxAnchor class="w-full">
            <ControlComboboxTrigger
                :id="fieldContext?.state.fieldId"
                :aria-invalid="widgetContext.state.validationState.invalid || undefined"
                :aria-required="widgetContext.state.required || undefined"
                :class="triggerClass"
                data-qa="widget-combobox"
                @blur="widgetContext.blur"
                @focus="widgetContext.focus"
            >
                <span v-if="closedStateLabel">{{ closedStateLabel }}</span>
                <span v-else class="text-muted-foreground">{{ effectivePlaceholder }}</span>
                <ChevronDownIcon class="size-4 opacity-50" />
            </ControlComboboxTrigger>
        </ControlComboboxAnchor>
        <ControlComboboxList class="w-[var(--reka-combobox-trigger-width)]">
            <ControlComboboxInput
                v-model="comboboxSearch.query"
                :placeholder="isApiMode ? 'Type to search...' : 'Search...'"
            />
            <ControlComboboxViewport>
                <ControlComboboxEmpty>{{ emptyMessage }}</ControlComboboxEmpty>
                <template v-if="isGrouped">
                    <ControlComboboxGroup
                        v-for="group in displayOptions"
                        :key="group[comboboxSearch.groupByField]"
                        :heading="group[comboboxSearch.groupByField]"
                    >
                        <ControlComboboxItem
                            v-for="item in group.items"
                            :key="item[comboboxSearch.optionValue]"
                            :value="item[comboboxSearch.optionValue]"
                            :text-value="item[comboboxSearch.optionLabel]"
                        >
                            {{ item[comboboxSearch.optionLabel] }}
                            <ControlComboboxItemIndicator>
                                <CheckIcon class="size-4" />
                            </ControlComboboxItemIndicator>
                        </ControlComboboxItem>
                    </ControlComboboxGroup>
                </template>
                <template v-else>
                    <ControlComboboxItem
                        v-for="option in displayOptions"
                        :key="isApiMode ? option[comboboxSearch.optionValue] : option[props.optionValue]"
                        :value="isApiMode ? option[comboboxSearch.optionValue] : option[props.optionValue]"
                        :text-value="isApiMode ? option[comboboxSearch.optionLabel] : option[props.optionLabel]"
                    >
                        {{ isApiMode ? option[comboboxSearch.optionLabel] : option[props.optionLabel] }}
                        <ControlComboboxItemIndicator>
                            <CheckIcon class="size-4" />
                        </ControlComboboxItemIndicator>
                    </ControlComboboxItem>
                </template>
            </ControlComboboxViewport>
        </ControlComboboxList>
    </ControlCombobox>
</template>
