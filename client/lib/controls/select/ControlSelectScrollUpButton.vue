<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { SelectScrollUpButton, useForwardProps } from "reka-ui";

/**
 * Scroll-up affordance inside ControlSelectContent.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwardedProps = useForwardProps(delegatedProps);

const theme = useTheme("ControlSelectScrollUpButton", props);
</script>

<template>
    <SelectScrollUpButton
        data-slot="select-scroll-up-button"
        v-bind="forwardedProps"
        :class="[theme('root'), props.class]"
    >
        <slot>
            <span aria-hidden="true" class="select-none">▴</span>
        </slot>
    </SelectScrollUpButton>
</template>
