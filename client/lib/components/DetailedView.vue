<script setup>
import DetailView from "@vueda/components/DetailView.vue";

/**
 * Deprecated alias for DetailView. Use DetailView directly instead.
 * This component passes all props, attrs, and slots through to DetailView unchanged,
 * and emits a one-time deprecation warning in development builds.
 */
defineOptions({});

const DEPRECATION_WARNING_KEY = "__VUEDA_DETAILED_VIEW_DEPRECATION_WARNED__";

if (import.meta.env.DEV && !globalThis[DEPRECATION_WARNING_KEY]) {
    console.warn(
        "[vueda] DetailedView is deprecated and will be removed in the next major release. Import @vueda/components/DetailView.vue instead.",
    );
    globalThis[DEPRECATION_WARNING_KEY] = true;
}
</script>

<template>
    <detail-view v-bind="$attrs">
        <template v-for="(_, slot) in $slots" #[slot]="slotProps">
            <slot :name="slot" v-bind="slotProps || {}" />
        </template>
    </detail-view>
</template>

<style scoped></style>
