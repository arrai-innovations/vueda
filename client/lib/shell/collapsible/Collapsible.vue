<script setup>
import "@vueda/theme/vueda-tailwind/shell/Collapsible.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { CollapsibleRoot, useForwardProps } from "reka-ui";

/**
 * Root collapsible component built on Reka UI's CollapsibleRoot.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The controlled open state. */
    modelValue: { type: Boolean, default: undefined },
    /** The default open state. */
    defaultOpen: { type: Boolean, default: undefined },
    /** Whether to unmount the content when closed. Set false to preserve form fields and their validation. */
    unmountOnHide: { type: Boolean, default: true },
    /** Whether the collapsible is disabled. */
    disabled: { type: Boolean, default: undefined },
    /** The reading direction. */
    dir: { type: String, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});
const emits = defineEmits({
    /** Emitted when the value changes. */
    "update:modelValue": null,
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride", "modelValue");
const forwarded = useForwardProps(delegatedProps);
const theme = useTheme("Collapsible", props);
</script>

<template>
    <CollapsibleRoot
        v-slot="slotProps"
        data-slot="collapsible"
        v-bind="forwarded"
        :open="modelValue"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        @update:open="emits('update:modelValue', $event)"
    >
        <slot v-bind="slotProps" />
    </CollapsibleRoot>
</template>
