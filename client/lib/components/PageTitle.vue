<script setup>
import LoadingSpinnerInline from "@vueda/components/LoadingSpinnerInline.vue";

defineProps({
    headerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    loadingClass: {
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
});
</script>
<template>
    <div class="sticky top-0 z-30 bg-neutral-100 dark:bg-neutral-900 pb-1 md:pb-2 lg:pb-4" :class="headerClass">
        <div
            class="w-full flex flex-col sm:flex-row sm:justify-between items-baseline px-4 md:px-7 lg:px-11 gap-2 md:gap-4 lg:gap-7"
        >
            <div class="w-full sm:w-auto">
                <h1 class="text-3xl font-bold leading-relaxed">
                    <slot name="title">{{ title }}</slot>
                </h1>
                <loading-spinner-inline v-if="loading" :class="loadingClass" />
            </div>
            <hr class="w-full flex-1 border-neutral-300 dark:border-neutral-600 border-t-2" />
            <div class="w-full sm:w-auto self-start">
                <slot name="button" />
            </div>
        </div>
        <div
            class="w-full flex flex-col sm:flex-row sm:justify-between items-baseline px-4 md:px-7 lg:px-11 gap-2 md:gap-4 lg:gap-7"
        >
            <div><slot name="subtitle" /></div>
            <div><slot name="under-actions" /></div>
        </div>
        <slot name="footer" />
    </div>
</template>
