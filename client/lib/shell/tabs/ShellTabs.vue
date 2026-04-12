<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { TabsRoot, useForwardPropsEmits } from "reka-ui";

/**
 * Root tabs component built on Reka UI's TabsRoot.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The value of the default active tab. */
    defaultValue: { type: String, default: undefined },
    /** The controlled value of the active tab. */
    modelValue: { type: String, default: undefined },
    /** The activation mode for tabs. */
    activationMode: { type: String, default: undefined },
    /** The reading direction. */
    dir: { type: String, default: undefined },
    /** The orientation of the tabs. */
    orientation: { type: String, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});
const emits = defineEmits({
    /** Emitted when the value changes. */
    "update:modelValue": null,
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("ShellTabs", props);
</script>

<template>
    <TabsRoot v-slot="slotProps" data-slot="tabs" v-bind="forwarded" :class="[theme('root'), props.class]">
        <slot v-bind="slotProps" />
    </TabsRoot>
</template>
