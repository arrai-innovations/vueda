<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * The primary content area of a Item, arranged vertically with a flex column layout.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the content container. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ItemContent", props);
</script>

<template>
    <div data-slot="item-content" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <slot />
    </div>
</template>
