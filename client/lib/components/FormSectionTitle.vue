<script setup>
import "@vueda/theme/vueda-tailwind/form/FormSectionTitle.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * Eyebrow-style title for a `FormSection`'s `title` slot.
 * Renders an `h3` carrying the 11 px / 600 / uppercase / 0.06 em recipe
 * (§ 3.3 Eyebrow micro-text) tinted muted-foreground.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes applied to the title element.
     *
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("FormSectionTitle", props);
</script>

<template>
    <h3
        data-slot="form-section-title"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        data-qa="form-section-title"
    >
        <slot />
    </h3>
</template>
