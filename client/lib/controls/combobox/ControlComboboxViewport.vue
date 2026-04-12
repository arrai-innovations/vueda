<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxViewport, useForwardProps } from "reka-ui";

/**
 * Scrollable viewport inside ControlComboboxList.
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
    /** Nonce for inline styles in strict CSP environments. */
    nonce: { type: String, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwarded = useForwardProps(delegatedProps);

const theme = useTheme("ControlComboboxViewport", props);
</script>

<template>
    <ComboboxViewport data-slot="combobox-viewport" v-bind="forwarded" :class="[theme('root'), props.class]">
        <slot />
    </ComboboxViewport>
</template>
