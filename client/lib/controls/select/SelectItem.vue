<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { SelectItem, SelectItemIndicator, SelectItemText, useForwardProps } from "reka-ui";

/**
 * A selectable option within SelectContent.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The value submitted with the form. */
    value: { type: [String, Number, Boolean, Object], required: true },
    /** When true, prevents user interaction. */
    disabled: { type: Boolean, default: undefined },
    /** Plain-text representation used for typeahead. */
    textValue: { type: String, default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwardedProps = useForwardProps(delegatedProps);

const theme = useTheme("SelectItem", props);
</script>

<template>
    <SelectItem data-slot="select-item" v-bind="forwardedProps" :class="[theme('root'), props.class]">
        <span class="absolute right-2 flex size-3.5 items-center justify-center">
            <SelectItemIndicator>
                <slot name="indicator-icon">
                    <span aria-hidden="true" class="select-none">✓</span>
                </slot>
            </SelectItemIndicator>
        </span>
        <SelectItemText>
            <slot />
        </SelectItemText>
    </SelectItem>
</template>
