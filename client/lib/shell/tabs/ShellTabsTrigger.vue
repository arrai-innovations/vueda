<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { TabsTrigger, useForwardProps } from "reka-ui";

/**
 * A tab trigger button that activates its associated TabsContent.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The value that links this trigger to its content panel. */
    value: { type: String, default: undefined },
    /** Whether the trigger is disabled. */
    disabled: { type: Boolean, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwardedProps = useForwardProps(delegatedProps);
const theme = useTheme("ShellTabsTrigger", props);
</script>

<template>
    <TabsTrigger data-slot="tabs-trigger" :class="[theme('root'), props.class]" v-bind="forwardedProps">
        <slot />
    </TabsTrigger>
</template>
