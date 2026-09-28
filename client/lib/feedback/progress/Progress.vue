<script setup>
import "@vueda/theme/vueda-tailwind/feedback/Progress.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ProgressIndicator, ProgressRoot } from "reka-ui";
import { computed, reactive, toRef } from "vue";

/**
 * A progress bar component built on Reka UI's ProgressRoot.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The current progress value, from 0 to `max`. Omit it or pass `null` for an indeterminate bar. */
    modelValue: { type: Number, default: null },
    /** The maximum value. Defaults to 100. */
    max: { type: Number, default: undefined },
    /** A function that returns the accessible label for the current value. */
    getValueLabel: { type: Function, default: undefined },
    /**
     * Track and indicator height variant.
     * @type {'sm' | 'md' | 'lg'}
     */
    size: { type: String, default: undefined },
    /**
     * Status tone applied to track and indicator. Defaults to the primary surface.
     * @type {'success' | 'warning' | 'destructive'}
     */
    tone: { type: String, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride", "size", "tone");

const theme = useTheme("Progress", props, reactive({ size: toRef(props, "size"), tone: toRef(props, "tone") }));

const indeterminate = computed(() => props.modelValue == null);
const indicatorStyle = computed(() => {
    if (indeterminate.value) {
        return undefined;
    }
    const max = props.max ?? 100;
    return `transform: translateX(-${100 - (props.modelValue / max) * 100}%);`;
});
</script>

<template>
    <ProgressRoot
        data-slot="progress"
        :data-size="size"
        v-bind="delegatedProps"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <ProgressIndicator data-slot="progress-indicator" :class="theme('indicator')" :style="indicatorStyle" />
    </ProgressRoot>
</template>
