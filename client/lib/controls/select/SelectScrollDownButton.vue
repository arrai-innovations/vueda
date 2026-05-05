<script setup>
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { SelectScrollDownButton, useForwardProps } from "reka-ui";

/**
 * Scroll-down affordance inside SelectContent.
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

const theme = useTheme("SelectScrollDownButton", props);
const icon = useIcons("SelectScrollDownButton");
</script>

<template>
    <SelectScrollDownButton
        data-slot="select-scroll-down-button"
        v-bind="forwardedProps"
        :class="[theme('root'), props.class]"
    >
        <slot>
            <component
                :is="icon('caretDown').component"
                v-if="icon('caretDown')"
                v-bind="icon('caretDown').props"
                aria-hidden="true"
            />
        </slot>
    </SelectScrollDownButton>
</template>
