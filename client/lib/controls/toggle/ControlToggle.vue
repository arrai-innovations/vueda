<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { Toggle, useForwardPropsEmits } from "reka-ui";
import { reactive, toRef } from "vue";

/**
 * A toggle button built on Reka UI's Toggle, supporting variant and size styles via the theme system.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /**
     * Visual style variant.
     * @type {'default' | 'outline'}
     */
    variant: { type: String, default: "default" },
    /**
     * Size variant.
     * @type {'default' | 'sm' | 'lg'}
     */
    size: { type: String, default: "default" },
    /** Whether the toggle is pressed. */
    pressed: { type: Boolean, default: undefined },
    /** The default pressed state. */
    defaultPressed: { type: Boolean, default: undefined },
    /** Whether the toggle is disabled. */
    disabled: { type: Boolean, default: false },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const emits = defineEmits({
    /** Emitted when the pressed state changes. */
    "update:pressed": null,
});

const delegatedProps = reactiveOmit(props, "class", "size", "variant", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);

const theme = useTheme(
    "ControlToggle",
    props,
    reactive({
        variant: toRef(props, "variant"),
        size: toRef(props, "size"),
    }),
);
</script>

<template>
    <Toggle v-slot="slotProps" data-slot="toggle" v-bind="forwarded" :class="[theme('root'), props.class]">
        <slot v-bind="slotProps" />
    </Toggle>
</template>
