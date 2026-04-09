<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { TabsList } from "reka-ui";

/**
 * The list of tab triggers in a Tabs component.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The reading direction. */
    dir: { type: String, default: undefined },
    /** Whether to loop keyboard navigation. */
    loop: { type: Boolean, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const theme = useTheme("ShellTabsList", props);
</script>

<template>
    <TabsList data-slot="tabs-list" v-bind="delegatedProps" :class="[theme('root'), props.class]">
        <slot />
    </TabsList>
</template>
