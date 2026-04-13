<script setup>
import Input from "@vueda/controls/input/Input.vue";
import { useMaska } from "@vueda/use/useMaska.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, effectScope, inject, ref, watch } from "vue";

/**
 * A text input widget that renders a Input with form field integration.
 * Used for CharField and similar string-based fields when paired with FormField.
 * Supports optional input masking via the mask prop.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    /** Maska pattern string applied to the input (e.g. "###-###-####"). */
    mask: { type: String, default: undefined },
    /** Custom maska token definitions. */
    tokens: { type: Object, default: undefined },
});
const emit = defineEmits([...WIDGET_EMITS]);
/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const widgetContext = useWidget(props, emit);

const inputRef = ref(null);

const maskaOptions = computed(() => ({
    mask: props.mask,
    ...(props.tokens != null ? { tokens: props.tokens } : {}),
}));

let maskaScope = null;

const startMaska = () => {
    if (maskaScope) {
        return;
    }
    maskaScope = effectScope();
    maskaScope.run(() => {
        useMaska(inputRef, maskaOptions);
    });
};

const stopMaska = () => {
    maskaScope?.stop();
    maskaScope = null;
};

if (props.mask) {
    startMaska();
}

watch(
    () => props.mask,
    (mask) => {
        if (mask && !maskaScope) {
            startMaska();
        }
        if (!mask && maskaScope) {
            stopMaska();
        }
    },
);
</script>
<template>
    <Input
        :id="fieldContext?.state.fieldId"
        ref="inputRef"
        v-model="widgetContext.state.combinedValue"
        :disabled="widgetContext.state.disabled"
        :aria-invalid="widgetContext.state.validationState.invalid || undefined"
        :aria-required="widgetContext.state.required || undefined"
        :name="widgetContext.state.combinedName"
        v-bind="$attrs"
        data-qa="widget-text-input"
        @blur="widgetContext.blur"
        @focus="widgetContext.focus"
    />
</template>
