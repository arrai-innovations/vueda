<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { SliderRange, SliderRoot, SliderThumb, SliderTrack, useForwardPropsEmits } from "reka-ui";

/**
 * A range slider built on Reka UI's SliderRoot, rendering a track, range fill, and draggable thumbs.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
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

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);

const theme = useTheme("ControlSlider", props);
</script>

<template>
    <SliderRoot v-slot="{ modelValue }" data-slot="slider" :class="[theme('root'), props.class]" v-bind="forwarded">
        <SliderTrack data-slot="slider-track" :class="theme('track')">
            <SliderRange data-slot="slider-range" :class="theme('range')" />
        </SliderTrack>

        <SliderThumb v-for="(_, key) in modelValue" :key="key" data-slot="slider-thumb" :class="theme('thumb')" />
    </SliderRoot>
</template>
