<script setup>
import TagsInput from "@vueda/controls/tags-input/TagsInput.vue";
import TagsInputInput from "@vueda/controls/tags-input/TagsInputInput.vue";
import TagsInputItem from "@vueda/controls/tags-input/TagsInputItem.vue";
import TagsInputItemDelete from "@vueda/controls/tags-input/TagsInputItemDelete.vue";
import TagsInputItemText from "@vueda/controls/tags-input/TagsInputItemText.vue";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject, nextTick, ref, watch } from "vue";

/**
 * A tags input widget for a field that holds a list of values. Each entry becomes a removable tag,
 * and the field value is the array of entered strings. An entry is added on Enter, on the comma
 * delimiter, on paste, and when the input loses focus. Each entry is trimmed before it is added, so
 * ` 2` next to an existing `2` is a duplicate. With `numeric`, only entries written as decimal
 * numbers are added, such as `12`, `-2.5`, `.5`, or `1e3`. A rejected entry stays in the input,
 * marked invalid, until it is edited.
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

/** @param {string} entry */
const trimEntry = (entry) => String(entry).trim();

const entryInput = ref(null);
/** True while the input holds an entry the widget refused to add. */
const entryRejected = ref(false);

/**
 * Put refused entries back into the input, which the tags input cleared when it added them, and
 * mark the entry invalid. Both happen after the input event that added the entry has finished, so
 * that event's handler clears the mark from the previous entry and not this one.
 *
 * @param {string[]} rejected
 */
const restoreRejected = async (rejected) => {
    await nextTick();
    const input = entryInput.value?.$el;
    if (input) {
        input.value = [input.value, ...rejected].filter(Boolean).join(",");
    }
    entryRejected.value = true;
};

/** The accepted tags: the field value as an array of strings. */
const tags = computed(() => {
    const value = widgetContext.state.combinedValue;
    if (value === null || value === undefined || value === "") {
        return [];
    }
    return (Array.isArray(value) ? value : [value]).map(String);
});

/**
 * The tags bound to the tags input. The tags input keeps its own copy of them and refreshes that
 * copy only when this binding changes, so a refused entry sets a fresh copy of the accepted tags
 * here. Otherwise the tags input would keep the refused entry and send it again with the next one.
 */
const boundTags = ref([]);
watch(tags, (accepted) => (boundTags.value = accepted), { immediate: true });

/** @param {string[]} entries */
const setTags = (entries) => {
    const trimmed = entries.map(trimEntry);
    const rejected = trimmed.filter((entry) => entry !== "" && !isAccepted(entry));
    widgetContext.state.combinedValue = trimmed.filter(isAccepted);
    if (rejected.length) {
        boundTags.value = [...tags.value];
        restoreRejected(rejected);
    }
};
</script>
<template>
    <TagsInput
        :model-value="boundTags"
        add-on-paste
        add-on-blur
        delimiter=","
        :convert-value="trimEntry"
        :disabled="widgetContext.state.disabled"
        :name="widgetContext.state.combinedName"
        :aria-invalid="widgetContext.state.validationState.invalid || entryRejected || undefined"
        :data-warning="widgetContext.state.validationState.warning || undefined"
        v-bind="$attrs"
        data-qa="widget-tags-input"
        @update:model-value="setTags"
    >
        <TagsInputItem v-for="tag in tags" :key="tag" :value="tag">
            <TagsInputItemText />
            <TagsInputItemDelete />
        </TagsInputItem>
        <TagsInputInput
            :id="fieldContext?.state.fieldId"
            ref="entryInput"
            :placeholder="placeholder"
            :aria-invalid="entryRejected || undefined"
            :aria-required="widgetContext.state.required || undefined"
            @input="entryRejected = false"
            @blur="widgetContext.blur"
            @focus="widgetContext.focus"
        />
    </TagsInput>
</template>
