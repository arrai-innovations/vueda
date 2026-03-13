<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { SliderRange, SliderRoot, SliderThumb, SliderTrack, useForwardPropsEmits } from "reka-ui";

/**
 * A range slider built on Reka UI's SliderRoot, rendering a track, range fill, and draggable thumbs.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the slider root. */
    class: { type: [String, Array, Object], default: undefined },
    /** The default value(s) when uncontrolled. */
    defaultValue: { type: Array, default: undefined },
    /** The controlled value(s) (used with v-model). */
    modelValue: { type: Array, default: undefined },
    /** Whether the slider is disabled. */
    disabled: { type: Boolean, default: undefined },
    /** The orientation of the slider. */
    orientation: { type: String, default: undefined },
    /** The reading direction. */
    dir: { type: String, default: undefined },
    /** Whether the slider is visually inverted. */
    inverted: { type: Boolean, default: undefined },
    /** The minimum value. */
    min: { type: Number, default: undefined },
    /** The maximum value. */
    max: { type: Number, default: undefined },
    /** The step increment between values. */
    step: { type: Number, default: undefined },
    /** The minimum number of steps between multiple thumbs. */
    minStepsBetweenThumbs: { type: Number, default: undefined },
    /** How thumbs align relative to the track end. */
    thumbAlignment: { type: String, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
    /** The name submitted with a form. */
    name: { type: String, default: undefined },
    /** Whether the field is required. */
    required: { type: Boolean, default: undefined },
});

const emits = defineEmits(["update:modelValue"]);

const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
    <SliderRoot
        v-slot="{ modelValue }"
        data-slot="slider"
        :class="
            cn(
                'relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col',
                props.class,
            )
        "
        v-bind="forwarded"
    >
        <SliderTrack
            data-slot="slider-track"
            class="bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
        >
            <SliderRange
                data-slot="slider-range"
                class="bg-primary absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
            />
        </SliderTrack>

        <SliderThumb
            v-for="(_, key) in modelValue"
            :key="key"
            data-slot="slider-thumb"
            class="bg-white border-primary ring-ring/50 block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
        />
    </SliderRoot>
</template>
