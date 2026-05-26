<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * An action slot positioned in the trailing column of a CardHeader grid.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("CardAction", props);
</script>

<template>
    <div data-slot="card-action" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
