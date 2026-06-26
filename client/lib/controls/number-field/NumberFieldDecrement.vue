<script setup>
import "@vueda/theme/vueda-tailwind/controls/NumberFieldDecrement.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { NumberFieldDecrement, useForwardProps } from "reka-ui";

/**
 * A decrement button for NumberField, absolutely positioned to the left
 * of the input and rendering a Minus icon by default.
 */
defineOptions({});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** When true, disables the decrement button. */
    disabled: { type: Boolean, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: "button" },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "iconOverride", "class", "themeOverride");
const forwarded = useForwardProps(delegatedProps);

const theme = useTheme("NumberFieldDecrement", props);
const icon = useIcons("NumberFieldDecrement", props);
</script>

<template>
    <NumberFieldDecrement
        data-slot="decrement"
        v-bind="forwarded"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot>
            <component
                :is="icon('minus').component"
                v-if="icon('minus')"
                v-bind="icon('minus').props"
                aria-hidden="true"
            />
            <span v-else aria-hidden="true" class="select-none">−</span>
        </slot>
    </NumberFieldDecrement>
</template>
