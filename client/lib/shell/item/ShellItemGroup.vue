<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A vertical list container for grouping multiple ShellItem components.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the group container. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ShellItemGroup", props);
</script>

<template>
    <div role="list" data-slot="item-group" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
