<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxInput, useForwardPropsEmits } from "reka-ui";

/**
 * The search input for ControlCombobox, rendered with a search icon.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The controlled search value. Can be bound with v-model. */
    modelValue: { type: String, default: undefined },
    /** Whether to focus the input on mount. */
    autoFocus: { type: Boolean, default: undefined },
    /** When true, prevents user interaction. */
    disabled: { type: Boolean, default: undefined },
    /** Function that returns the display string for the selected value. */
    displayValue: { type: Function, default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});
const emits = defineEmits({
    /** Emitted when the value changes. */
    "update:modelValue": null,
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwarded = useForwardPropsEmits(delegatedProps, emits);

const theme = useTheme("ControlComboboxInput", props);
</script>

<template>
    <div data-slot="combobox-input-wrapper" class="flex h-9 items-center gap-2 border-b px-3">
        <!-- Replaces the search icon; receives no slot props. -->
        <slot name="icon">
            <span aria-hidden="true" class="size-4 shrink-0 text-center leading-4 opacity-50 select-none">⚲</span>
        </slot>
        <ComboboxInput
            data-slot="combobox-input"
            :class="[theme('root'), props.class]"
            v-bind="{ ...$attrs, ...forwarded }"
        >
            <slot />
        </ComboboxInput>
    </div>
</template>
