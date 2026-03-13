<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxViewport, useForwardProps } from "reka-ui";

/**
 * Scrollable viewport inside ControlComboboxList.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
    /** Nonce for inline styles in strict CSP environments. */
    nonce: { type: String, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class");

const forwarded = useForwardProps(delegatedProps);
</script>

<template>
    <ComboboxViewport
        data-slot="combobox-viewport"
        v-bind="forwarded"
        :class="cn('max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto', props.class)"
    >
        <slot />
    </ComboboxViewport>
</template>
