<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxTrigger, useForwardProps } from "reka-ui";

/**
 * A button that opens the ControlCombobox list.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** When true, prevents user interaction. */
    disabled: { type: Boolean, default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwarded = useForwardProps(delegatedProps);

const theme = useTheme("ControlComboboxTrigger", props);
</script>

<template>
    <ComboboxTrigger data-slot="combobox-trigger" tabindex="0" v-bind="forwarded" :class="[theme('root'), props.class]">
        <slot />
    </ComboboxTrigger>
</template>
