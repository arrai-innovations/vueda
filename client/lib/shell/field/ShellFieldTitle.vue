<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A non-interactive label-styled div for titling a field when a semantic label
 * element is not appropriate, such as when the field contains its own label.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ShellFieldTitle", props);
</script>

<template>
    <div data-slot="field-label" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
