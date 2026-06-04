<script setup>
import "@vueda/theme/vueda-tailwind/shell/ItemMedia.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactive, toRef } from "vue";

/**
 * A media slot inside a Item for icons or images, with variant-based sizing and styling.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the media container. */
    class: { type: [String, Array, Object], default: undefined },
    /** The visual style variant controlling size and appearance. */
    variant: { type: String, default: undefined },
});

const theme = useTheme("ItemMedia", props, reactive({ variant: toRef(props, "variant") }));
</script>

<template>
    <div
        data-slot="item-media"
        :data-variant="props.variant"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot />
    </div>
</template>
