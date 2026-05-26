<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A supporting description paragraph inside a Item, styled with muted text and line clamping.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the description element. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ItemDescription", props);
</script>

<template>
    <p data-slot="item-description" :class="[theme('root'), props.class]">
        <slot />
    </p>
</template>
