<script setup>
import LoadingSpinnerInline from "@vueda/components/LoadingSpinnerInline.vue";

defineProps({
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
});
</script>
<template>
    <div
        :class="[
            headerClass,
            {
                'sticky top-0 z-30': sticky,
            },
        ]"
    >
        <div class="bg-surface-0 dark:bg-surface-950 flex flex-col gap-1 py-1">
            <div class="w-full flex flex-col sm:flex-row sm:justify-between items-baseline gap-2 md:gap-4 lg:gap-7">
                <div class="w-full sm:w-auto flex items-baseline">
                    <h1 class="font-bold leading-relaxed text-3xl">
                        <slot name="title">{{ title }}</slot>
                        <template v-if="loading">
                            &nbsp;
                            <loading-spinner-inline v-if="loading" />
                        </template>
                    </h1>
                </div>
                <hr class="w-full flex-1 border-primary-300 dark:border-primary-600 border-t-2" />
                <div class="w-full sm:w-auto self-start flex flex-col sm:flex-row">
                    <slot name="button" />
                </div>
            </div>
            <div class="w-full flex flex-col sm:flex-row sm:justify-between items-baseline gap-2 md:gap-4 lg:gap-7">
                <slot name="subtitle" />
                <slot name="under-actions" />
            </div>
            <slot name="footer" />
        </div>
        <div
            class="w-full h-2 md:h-3 lg:h-4 bg-gradient-to-b from-surface-0 to-transparent dark:from-surface-950 dark:to-transparent"
        />
    </div>
</template>
