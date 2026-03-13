<script setup>
import LoadingSpinnerInline from "@vueda/components/LoadingSpinnerInline.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactive, toRef } from "vue";

/**
 * Page-level header bar that displays a title, optional loading spinner, action buttons, subtitle, and footer content, with optional sticky positioning.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS class(es) applied to the header container element. */
    headerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    /** When `true`, a loading spinner is shown inline after the title text. */
    loading: {
        type: Boolean,
        default: undefined,
    },
    /** Title text rendered inside the `<h1>` element when no `title` slot is provided. */
    title: {
        type: String,
        default: undefined,
    },
    /** When `true`, the header is positioned sticky and a gradient overlay is rendered below it. */
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
                        <!-- Page title content rendered inside the `<h1>`; falls back to the `title` prop. -->
                        <slot name="title">{{ title }}</slot>
                        <template v-if="loading">
                            &nbsp;
                            <loading-spinner-inline v-if="loading" />
                        </template>
                    </h1>
                    <!-- Content rendered to the right of the title text, inside the title row. -->
                    <slot name="title-suffix" />
                </div>
                <div :class="theme('buttons')">
                    <!-- Action buttons rendered in the header action area. -->
                    <slot name="button" />
                </div>
                <hr :class="theme('spacer')" />
            </div>
            <hr :class="theme('divider')" />
            <div v-if="$slots.subtitle || $slots['under-actions']" :class="theme('subtitleContainer')">
                <!-- Subtitle content rendered below the divider. -->
                <slot name="subtitle" />
                <!-- Content rendered alongside the subtitle, aligned to the action side. -->
                <slot name="under-actions" />
            </div>
            <!-- Footer content rendered at the bottom of the header container. -->
            <slot :class="theme('footer')" name="footer" />
        </div>
        <div v-if="sticky" :class="theme('gradient')" />
    </div>
</template>
