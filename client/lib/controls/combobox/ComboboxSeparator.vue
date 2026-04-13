<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxSeparator } from "reka-ui";

/**
 * A visual divider between groups or items in ComboboxList.
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

const theme = useTheme("ComboboxSeparator", props);
</script>

<template>
    <ComboboxSeparator data-slot="combobox-separator" v-bind="delegatedProps" :class="[theme('root'), props.class]">
        <slot />
    </ComboboxSeparator>
</template>
