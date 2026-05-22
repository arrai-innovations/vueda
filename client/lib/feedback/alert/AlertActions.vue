<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A trailing action row inside an Alert. Aligns with the Alert grid's
 * second column (matching title and description), so dismiss / primary
 * action buttons sit flush under the description text.
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

const theme = useTheme("AlertActions", props);
</script>

<template>
    <div data-slot="alert-actions" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
