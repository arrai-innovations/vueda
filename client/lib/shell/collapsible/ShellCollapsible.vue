<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { CollapsibleRoot, useForwardPropsEmits } from "reka-ui";

/**
 * Root collapsible component built on Reka UI's CollapsibleRoot.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The controlled open state. */
    modelValue: { type: Boolean, default: undefined },
    /** The default open state. */
    defaultOpen: { type: Boolean, default: undefined },
    /** Whether the collapsible is disabled. */
    disabled: { type: Boolean, default: undefined },
    /** The reading direction. */
    dir: { type: String, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});
const emits = defineEmits(["update:modelValue"]);

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("ShellCollapsible", props);
</script>

<template>
    <CollapsibleRoot
        v-slot="slotProps"
        data-slot="collapsible"
        v-bind="forwarded"
        :class="[theme('root'), props.class]"
    >
        <slot v-bind="slotProps" />
    </CollapsibleRoot>
</template>
