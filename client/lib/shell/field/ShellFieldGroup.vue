<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A vertical stack container for grouping multiple ShellField instances,
 * with consistent spacing and container-query support for responsive layouts.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ShellFieldGroup", props);
</script>

<template>
    <div data-slot="field-group" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
