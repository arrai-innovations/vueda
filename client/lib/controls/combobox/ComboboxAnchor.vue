<script setup>
import "@vueda/theme/vueda-tailwind/controls/ComboboxAnchor.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxAnchor, useForwardProps } from "reka-ui";

/**
 * Anchor element that positions the ComboboxList relative to the trigger.
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

const forwarded = useForwardProps(delegatedProps);

const theme = useTheme("ComboboxAnchor", props);
</script>

<template>
    <ComboboxAnchor
        data-slot="combobox-anchor"
        v-bind="forwarded"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot />
    </ComboboxAnchor>
</template>
