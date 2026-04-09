<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A header row at the top of a ShellItem that distributes content between its start and end.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the header container. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ShellItemHeader", props);
</script>

<template>
    <div data-slot="item-header" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
