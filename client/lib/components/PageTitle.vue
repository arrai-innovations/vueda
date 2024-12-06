<script setup>
import LoadingSpinnerInline from "@vueda/components/LoadingSpinnerInline.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactive, toRef } from "vue";

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
        default: false,
    },
    ...THEME_OVERRIDE_PROPS,
});
const theme = useTheme(
    "PageTitle",
    props,
    reactive({
        headerClass: toRef(props, "headerClass"),
        sticky: toRef(props, "sticky"),
    }),
);
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
                <div :class="theme('buttons')">
                    <slot name="button" />
                </div>
                <hr :class="theme('spacer')" />
            </div>
            <hr :class="theme('divider')" />
            <div v-if="$slots.subtitle || $slots['under-actions']" :class="theme('subtitleContainer')">
                <slot name="subtitle" />
                <slot name="under-actions" />
            </div>
            <slot :class="theme('footer')" name="footer" />
        </div>
        <div v-if="sticky" :class="theme('gradient')" />
    </div>
</template>
