<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { TabsRoot, useForwardPropsEmits } from "reka-ui";

/**
 * Root tabs component built on Reka UI's TabsRoot.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
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
const emits = defineEmits(["update:modelValue"]);

const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
    <TabsRoot v-slot="slotProps" data-slot="tabs" v-bind="forwarded" :class="cn('flex flex-col gap-2', props.class)">
        <slot v-bind="slotProps" />
    </TabsRoot>
</template>
