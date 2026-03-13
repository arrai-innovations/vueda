<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { CircleIcon } from "lucide-vue-next";
import { RadioGroupIndicator, RadioGroupItem, useForwardProps } from "reka-ui";

/**
 * A single radio button within a ControlRadioGroup, rendering a circular indicator
 * when selected and forwarding all native radio props to the underlying primitive.
 */
defineOptions({});

const props = defineProps({
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

const delegatedProps = reactiveOmit(props, "class");
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
    <RadioGroupItem
        data-slot="radio-group-item"
        v-bind="forwardedProps"
        :class="
            cn(
                'border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
                props.class,
            )
        "
    >
        <RadioGroupIndicator data-slot="radio-group-indicator" class="relative flex items-center justify-center">
            <slot>
                <CircleIcon class="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2" />
            </slot>
        </RadioGroupIndicator>
    </RadioGroupItem>
</template>
