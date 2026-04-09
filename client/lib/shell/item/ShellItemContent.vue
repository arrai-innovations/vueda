<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * The primary content area of a ShellItem, arranged vertically with a flex column layout.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the content container. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ShellItemContent", props);
</script>

<template>
    <div data-slot="item-content" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
