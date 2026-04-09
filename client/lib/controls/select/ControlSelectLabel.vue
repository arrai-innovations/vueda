<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { SelectLabel } from "reka-ui";

/**
 * A label for a ControlSelectGroup.
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

const theme = useTheme("ControlSelectLabel", props);
</script>

<template>
    <SelectLabel data-slot="select-label" :as="as" :as-child="asChild" :class="[theme('root'), props.class]">
        <slot />
    </SelectLabel>
</template>
