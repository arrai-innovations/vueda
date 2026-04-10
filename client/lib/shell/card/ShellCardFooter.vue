<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * The footer section of a Card component.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ShellCardFooter", props);
</script>

<template>
    <div data-slot="card-footer" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
