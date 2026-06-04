<script setup>
import "@vueda/theme/vueda-tailwind/display/AvatarImage.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { AvatarImage } from "reka-ui";

/**
 * The image element inside a Avatar.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The image source URL. */
    src: { type: String, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const theme = useTheme("AvatarImage", props);
</script>

<template>
    <AvatarImage
        data-slot="avatar-image"
        v-bind="delegatedProps"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    />
</template>
