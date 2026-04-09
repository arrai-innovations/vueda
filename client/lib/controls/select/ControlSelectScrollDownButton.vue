<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ChevronDown } from "lucide-vue-next";
import { SelectScrollDownButton, useForwardProps } from "reka-ui";

/**
 * Scroll-down affordance inside ControlSelectContent.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwardedProps = useForwardProps(delegatedProps);

const theme = useTheme("ControlSelectScrollDownButton", props);
</script>

<template>
    <SelectScrollDownButton
        data-slot="select-scroll-down-button"
        v-bind="forwardedProps"
        :class="[theme('root'), props.class]"
    >
        <slot>
            <ChevronDown class="size-4" />
        </slot>
    </SelectScrollDownButton>
</template>
