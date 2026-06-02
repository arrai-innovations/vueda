<script setup>
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { SelectIcon, SelectTrigger, useForwardProps } from "reka-ui";

/**
 * The button that opens the Select dropdown.
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
     * Visual size variant.
     * @type {'default' | 'sm' | 'lg'}
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

const theme = useTheme("SelectTrigger", props);
const icon = useIcons("SelectTrigger");
</script>

<template>
    <SelectTrigger
        data-slot="select-trigger"
        :data-size="size"
        v-bind="forwardedProps"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot />
        <SelectIcon as-child>
            <!-- Replaces the dropdown chevron icon; receives no slot props. -->
            <slot name="icon">
                <component
                    :is="icon('caretDown').component"
                    v-if="icon('caretDown')"
                    v-bind="icon('caretDown').props"
                    aria-hidden="true"
                    class="size-4 opacity-50"
                />
            </slot>
        </SelectIcon>
    </SelectTrigger>
</template>
