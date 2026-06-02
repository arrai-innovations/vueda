<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A row of action controls (e.g. buttons) aligned at the end of a Item.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the actions container. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ItemActions", props);
</script>

<template>
    <div data-slot="item-actions" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <slot />
    </div>
</template>
