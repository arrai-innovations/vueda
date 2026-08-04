<script setup>
import "@vueda/theme/vueda-tailwind/controls/NumberField.theme.js";
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { NumberFieldRoot } from "reka-ui";

/**
 * A numeric input container built on Reka UI's NumberFieldRoot, providing
 * increment/decrement controls, min/max constraints, and v-model binding.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The controlled numeric value. */
    modelValue: { type: Number, default: undefined },
    /** The default value when uncontrolled. */
    defaultValue: { type: Number, default: undefined },
    /** The minimum allowed value. */
    min: { type: Number, default: undefined },
    /** The maximum allowed value. */
    max: { type: Number, default: undefined },
    /** The amount the value changes per increment or decrement step. */
    step: { type: Number, default: undefined },
    /** When false, prevents snapping to the nearest step increment. */
    stepSnapping: { type: Boolean, default: undefined },
    /** When true, focuses the input when the value changes. */
    focusOnChange: { type: Boolean, default: undefined },
    /** Intl.NumberFormatOptions to format the displayed value. */
    formatOptions: { type: Object, default: undefined },
    /** The locale used for formatting. */
    locale: { type: String, default: undefined },
    /** When true, prevents interaction with the number field. */
    disabled: { type: Boolean, default: undefined },
    /** When true, the field is read-only. */
    readonly: { type: Boolean, default: undefined },
    /** When true, prevents value changes on mouse wheel scroll. */
    disableWheelChange: { type: Boolean, default: undefined },
    /** When true, inverts the direction of wheel-driven value changes. */
    invertWheelChange: { type: Boolean, default: undefined },
    /** The id of the underlying input element. */
    id: { type: String, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
    /** The name submitted with form data. */
    name: { type: String, default: undefined },
    /** When true, the field is required. */
    required: { type: Boolean, default: false },
});

const emits = defineEmits({
    /** Emitted when the value changes. */
    "update:modelValue": null,
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);

const theme = useTheme("NumberField", props);
</script>

<template>
    <NumberFieldRoot
        v-slot="slotProps"
        data-slot="number-field"
        v-bind="forwarded"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot v-bind="slotProps" />
    </NumberFieldRoot>
</template>
