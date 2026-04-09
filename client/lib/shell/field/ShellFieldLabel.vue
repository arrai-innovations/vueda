<script setup>
import { ShellLabel } from "@vueda/shell/label/index.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A field label built on ShellLabel that optionally wraps an inline control,
 * applying checked-state highlights when paired with a checkbox or radio.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ShellFieldLabel", props);
</script>

<template>
    <ShellLabel data-slot="field-label" :class="[theme('root'), props.class]">
        <slot />
    </ShellLabel>
</template>
