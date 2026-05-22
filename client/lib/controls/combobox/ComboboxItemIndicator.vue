<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxItemIndicator, useForwardProps } from "reka-ui";

/**
 * Visual indicator shown when a ComboboxItem is selected.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwarded = useForwardProps(delegatedProps);

const theme = useTheme("ComboboxItemIndicator", props);
</script>

<template>
    <ComboboxItemIndicator data-slot="combobox-item-indicator" v-bind="forwarded" :class="[theme('root'), props.class]">
        <slot />
    </ComboboxItemIndicator>
</template>
