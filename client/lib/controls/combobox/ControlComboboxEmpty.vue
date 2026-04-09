<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxEmpty } from "reka-ui";

/**
 * Shown inside ControlComboboxList when no items match the current search.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const theme = useTheme("ControlComboboxEmpty", props);
</script>

<template>
    <ComboboxEmpty data-slot="combobox-empty" v-bind="delegatedProps" :class="[theme('root'), props.class]">
        <slot />
    </ComboboxEmpty>
</template>
