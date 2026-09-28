<script setup>
import TagsInput from "@vueda/controls/tags-input/TagsInput.vue";
import TagsInputInput from "@vueda/controls/tags-input/TagsInputInput.vue";
import TagsInputItem from "@vueda/controls/tags-input/TagsInputItem.vue";
import TagsInputItemDelete from "@vueda/controls/tags-input/TagsInputItemDelete.vue";
import TagsInputItemText from "@vueda/controls/tags-input/TagsInputItemText.vue";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject } from "vue";

/**
 * A tags input widget for a field that holds a list of values. Each entry becomes a removable tag,
 * and the field value is the array of entered strings. An entry is added on Enter, on the comma
 * delimiter, on paste, and when the input loses focus. With `numeric`, only entries written as
 * decimal numbers are added, such as `12`, `-2.5`, `.5`, or `1e3`.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    /** When true, only entries written as decimal numbers are added, the forms a Django `DecimalField` reads. */
    numeric: { type: Boolean, default: false },
    /** Placeholder text shown in the entry input. */
    placeholder: { type: String, default: undefined },
});
const emit = defineEmits([...WIDGET_EMITS]);
/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const widgetContext = useWidget(props, emit);

/** A decimal number: optional sign, digits with an optional fraction, and an optional exponent. */
const DECIMAL_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

/**
 * @param {string} entry
 * @returns {boolean}
 */
const isAccepted = (entry) => entry !== "" && (!props.numeric || DECIMAL_PATTERN.test(entry));

const tags = computed({
    get: () => {
        const value = widgetContext.state.combinedValue;
        if (value === null || value === undefined || value === "") {
            return [];
        }
        return (Array.isArray(value) ? value : [value]).map(String);
    },
    set: (entries) => {
        widgetContext.state.combinedValue = entries.map((entry) => String(entry).trim()).filter(isAccepted);
    },
});
</script>
<template>
    <TagsInput
        v-model="tags"
        add-on-paste
        add-on-blur
        delimiter=","
        :disabled="widgetContext.state.disabled"
        :name="widgetContext.state.combinedName"
        :aria-invalid="widgetContext.state.validationState.invalid || undefined"
        :data-warning="widgetContext.state.validationState.warning || undefined"
        v-bind="$attrs"
        data-qa="widget-tags-input"
    >
        <TagsInputItem v-for="tag in tags" :key="tag" :value="tag">
            <TagsInputItemText />
            <TagsInputItemDelete />
        </TagsInputItem>
        <TagsInputInput
            :id="fieldContext?.state.fieldId"
            :placeholder="placeholder"
            :aria-required="widgetContext.state.required || undefined"
            @blur="widgetContext.blur"
            @focus="widgetContext.focus"
        />
    </TagsInput>
</template>
