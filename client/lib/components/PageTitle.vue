<script setup>
import LoadingSpinnerInline from "@vueda/components/LoadingSpinnerInline.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { breakpointsVueda } from "@vueda/utils/breakpoints.js";
import { useBreakpoints } from "@vueuse/core";

const props = defineProps({
    headerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    titleClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    loading: {
        type: Boolean,
        default: undefined,
    },
    title: {
        type: String,
        default: undefined,
    },
    sticky: {
        type: Boolean,
        default: true,
    },
    ...THEME_OVERRIDE_PROPS,
});
const theme = useTheme("PageTitle", props);
let breakpoints, breakpointsActive;
if (import.meta.env.DEV) {
    breakpoints = useBreakpoints(breakpointsVueda);
    breakpointsActive = breakpoints.active();
}
</script>
<template>
    <div :class="theme('root')">
        <div :class="theme('container')">
            <div :class="theme('titleContainer')">
                <div :class="theme('titleWrapper')">
                    <h1 :class="theme('title')">
                        <slot name="title">{{ title }}</slot>
                        <template v-if="loading">
                            &nbsp;
                            <loading-spinner-inline v-if="loading" />
                        </template>
                    </h1>
                </div>
                <code v-if="breakpoints">
                    {{ breakpointsActive || "xs" }}
                </code>
                <hr :class="theme('divider')" />
                <div :class="theme('buttons')">
                    <slot name="button" />
                </div>
            </div>
            <div v-if="$slots.subtitle || $slots['under-actions']" :class="theme('subtitleContainer')">
                <slot name="subtitle" />
                <slot name="under-actions" />
            </div>
            <slot :class="theme('footer')" name="footer" />
        </div>
        <div :class="theme('gradient')" />
    </div>
</template>
