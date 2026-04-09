<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A footer row at the bottom of a ShellItem that distributes content between its start and end.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the footer container. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ShellItemFooter", props);
</script>

<template>
    <div data-slot="item-footer" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
