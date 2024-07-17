<script setup>
import LinkModelView from "@vueda/components/LinkModelView.vue";
import LoadingSpinnerInline from "@vueda/components/LoadingSpinnerInline.vue";
import { useRouteProps } from "@vueda/use/useRouteProps.js";
import { computed } from "vue";

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
});
const routeProps = useRouteProps();
const app = computed(() => routeProps.value.app);
const model = computed(() => routeProps.value.model);
const view = computed(() => routeProps.value.view);
</script>
<template>
    <div class="sticky top-0 z-30" :class="headerClass">
        <div class="bg-surface-0 dark:bg-surface-950">
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
                    <link-model-view
                        v-if="view !== 'list' && model && app"
                        :app="app"
                        class="whitespace-nowrap grow shrink-0"
                        label="Return to List"
                        :model="model"
                        view="list"
                    />
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
