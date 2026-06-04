<script setup>
import "@vueda/theme/vueda-tailwind/navigation/MenubarLabel.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { MenubarLabel } from "reka-ui";

/**
 * A non-interactive label within a menubar menu.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
    /** When true, adds left padding to align with items that have an icon. */
    inset: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride", "inset");
const theme = useTheme("MenubarLabel", props);
</script>

<template>
    <MenubarLabel
        data-slot="menubar-label"
        :data-inset="inset ? '' : undefined"
        v-bind="delegatedProps"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot />
    </MenubarLabel>
</template>
