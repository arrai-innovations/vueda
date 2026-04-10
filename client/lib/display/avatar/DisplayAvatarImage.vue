<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { AvatarImage } from "reka-ui";

/**
 * The image element inside a DisplayAvatar.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The image source URL. */
    src: { type: String, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const theme = useTheme("DisplayAvatarImage", props);
</script>

<template>
    <AvatarImage data-slot="avatar-image" v-bind="delegatedProps" :class="[theme('root'), props.class]" />
</template>
