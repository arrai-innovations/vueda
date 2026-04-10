<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { AvatarRoot } from "reka-ui";

/**
 * Root avatar container with fallback support via DisplayAvatarImage and DisplayAvatarFallback.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const theme = useTheme("DisplayAvatar", props);
</script>

<template>
    <AvatarRoot data-slot="avatar" v-bind="delegatedProps" :class="[theme('root'), props.class]">
        <slot />
    </AvatarRoot>
</template>
