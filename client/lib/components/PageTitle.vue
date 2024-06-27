<script setup>
import { useCombineClasses } from "@arrai-innovations/reactive-helpers";
import LoadingSpinnerInline from "@vueda/components/LoadingSpinnerInline.vue";
import { areaClasses, formSectionTitleClasses } from "@vueda/site.theme";
import { toRef } from "vue";

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
const pageTitleClasses = useCombineClasses([
    toRef(() => areaClasses.site.paddingLgX),
    toRef(() => areaClasses.site.gapLg),
]);
const stickyClasses = useCombineClasses([
    toRef(() => areaClasses.pageTitle.background),
    toRef(() => areaClasses.site.paddingSmB),
]);
</script>
<template>
    <div class="sticky top-0 z-30" :class="stickyClasses">
        <div class="w-full flex flex-col sm:flex-row sm:justify-between items-baseline" :class="pageTitleClasses">
            <div class="w-full sm:w-auto">
                <h1 class="text-3xl font-bold leading-relaxed">
                    <slot name="title">{{ title }}</slot>
                </h1>
                <loading-spinner-inline v-if="loading" :class="loadingClass" />
            </div>
            <hr :class="formSectionTitleClasses.spacer" />
            <div class="w-full sm:w-auto self-start">
                <slot name="button" />
            </div>
        </div>
        <div class="w-full flex flex-col sm:flex-row sm:justify-between items-baseline" :class="pageTitleClasses">
            <div><slot name="subtitle" /></div>
            <div><slot name="under-actions" /></div>
        </div>
        <slot name="footer" />
    </div>
</template>
