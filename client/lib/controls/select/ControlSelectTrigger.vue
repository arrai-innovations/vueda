<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ChevronDown } from "lucide-vue-next";
import { SelectIcon, SelectTrigger, useForwardProps } from "reka-ui";

/**
 * The button that opens the ControlSelect dropdown.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /**
     * Visual size variant.
     * @type {'default' | 'sm'}
     */
    size: { type: String, default: "default" },
    /** When true, prevents user interaction. */
    disabled: { type: Boolean, default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "size", "themeOverride");

const forwardedProps = useForwardProps(delegatedProps);

const theme = useTheme("ControlSelectTrigger", props);
</script>

<template>
    <SelectTrigger
        data-slot="select-trigger"
        :data-size="size"
        v-bind="forwardedProps"
        :class="[theme('root'), props.class]"
    >
        <slot />
        <SelectIcon as-child>
            <ChevronDown class="size-4 opacity-50" />
        </SelectIcon>
    </SelectTrigger>
</template>
