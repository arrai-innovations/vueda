<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { Primitive, useForwardProps } from "reka-ui";

/**
 * A navigable link within a breadcrumb item.
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
    as: { type: [String, Object], default: "a" },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardProps(delegatedProps);
const theme = useTheme("NavigationBreadcrumbLink", props);
</script>

<template>
    <Primitive data-slot="breadcrumb-link" v-bind="forwarded" :class="[theme('root'), props.class]">
        <slot />
    </Primitive>
</template>
