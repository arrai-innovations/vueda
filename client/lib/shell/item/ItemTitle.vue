<script setup>
import "@vueda/theme/vueda-tailwind/shell/ItemTitle.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A title element inside a Item, rendered as an inline-flex row with icon support.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the title container. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ItemTitle", props);
</script>

<template>
    <div data-slot="item-title" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <slot />
    </div>
</template>
