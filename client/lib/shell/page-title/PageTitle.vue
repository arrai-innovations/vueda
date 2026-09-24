<script setup>
import LoadingSpinnerInline from "@vueda/display/loading/LoadingSpinnerInline.vue";
import Skeleton from "@vueda/feedback/skeleton/Skeleton.vue";
import "@vueda/theme/vueda-tailwind/shell/PageTitle.theme.js";
import { usePageTitle } from "@vueda/use/usePageTitle.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed, reactive, ref, toRef } from "vue";

/**
 * Page-level header bar that an integrator places in their layout (above `<RouterView>`). It reads
 * the active view's title and loading state from `usePageTitle` and hosts the page-action zone that
 * `PageActions` teleports into. The view supplies the data; this component decides where the page
 * `<h1>` and its actions appear, so the title is a layout concern rather than baked into each view.
 */
defineOptions({});

const props = defineProps({
    /** When `true`, the header is positioned sticky and pinned to the top of the scroll viewport. */
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
        sticky: toRef(props, "sticky"),
    }),
);

// Reuse the context the layout established; views register their title/loading into it.
const page = usePageTitle();
const title = computed(() => page.current.value.title);
const loading = computed(() => page.current.value.loading);
// A view is registered (`current` is `{}` only when none is) but has no title yet. The skeleton stays
// until the title arrives, so a view that never resolves one looks broken instead of mislabelled.
const titlePending = computed(() => "title" in page.current.value && !title.value);

// The element page actions teleport into. Bind the ref so the target resolves once mounted.
const actionZone = ref(null);
page.bindActionZone(actionZone);
</script>
<template>
    <div :class="theme('root')" :style="theme.hideStyle?.value">
        <div :class="theme('container')">
            <div :class="theme('titleContainer')">
                <div :class="theme('titleWrapper')">
                    <div :class="theme('titleRow')">
                        <skeleton
                            v-if="titlePending && !$slots.title"
                            :class="theme('titleSkeleton')"
                            data-qa="page-title-skeleton"
                        />
                        <h1 v-else :class="theme('title')">
                            <!-- Page title content rendered inside the `<h1>`; falls back to the active view's title. -->
                            <slot name="title">{{ title }}</slot>
                        </h1>
                        <span :class="theme('loading')" data-qa="page-title-loading">
                            <loading-spinner-inline v-if="loading" />
                        </span>
                    </div>
                </div>
                <!-- Page actions teleport here via PageActions; empty until a view contributes some. -->
                <div ref="actionZone" :class="theme('buttons')" data-qa="page-title-actions" />
            </div>
        </div>
    </div>
</template>
