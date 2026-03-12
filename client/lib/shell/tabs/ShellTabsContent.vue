<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { TabsContent } from "reka-ui";

/**
 * The content panel for a single tab in a Tabs component.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The value that links this content to its trigger. */
    value: { type: String, default: undefined },
    /** Whether to force mount the content. */
    forceMount: { type: Boolean, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
    <TabsContent data-slot="tabs-content" :class="cn('flex-1 outline-none', props.class)" v-bind="delegatedProps">
        <slot />
    </TabsContent>
</template>
