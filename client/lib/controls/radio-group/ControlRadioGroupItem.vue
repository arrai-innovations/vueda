<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { CircleIcon } from "lucide-vue-next";
import { RadioGroupIndicator, RadioGroupItem, useForwardProps } from "reka-ui";

/**
 * A single radio button within a ControlRadioGroup, rendering a circular indicator
 * when selected and forwarding all native radio props to the underlying primitive.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The value submitted with form data when this item is selected. */
    value: { type: [String, Number, Boolean, Object], default: undefined },
    /** When true, prevents interaction with this radio item. */
    disabled: { type: Boolean, default: false },
    /** The id attribute for the underlying input element. */
    id: { type: String, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: "button" },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
    /** The name submitted with form data. */
    name: { type: String, default: undefined },
    /** When true, the item is required. */
    required: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwardedProps = useForwardProps(delegatedProps);

const theme = useTheme("ControlRadioGroupItem", props);
</script>

<template>
    <RadioGroupItem data-slot="radio-group-item" v-bind="forwardedProps" :class="[theme('root'), props.class]">
        <RadioGroupIndicator data-slot="radio-group-indicator" class="relative flex items-center justify-center">
            <slot>
                <CircleIcon class="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2" />
            </slot>
        </RadioGroupIndicator>
    </RadioGroupItem>
</template>
