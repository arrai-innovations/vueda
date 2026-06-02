<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A semantic fieldset that groups related form controls with consistent vertical spacing,
 * adjusting gap for checkbox and radio groups automatically.
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

const theme = useTheme("FieldSet", props);
</script>

<template>
    <fieldset data-slot="field-set" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <slot />
    </fieldset>
</template>
