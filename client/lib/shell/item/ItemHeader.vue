<script setup>
import "@vueda/theme/vueda-tailwind/shell/ItemHeader.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A header row at the top of a Item that distributes content between its start and end.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the header container. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ItemHeader", props);
</script>

<template>
    <div data-slot="item-header" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <slot />
    </div>
</template>
