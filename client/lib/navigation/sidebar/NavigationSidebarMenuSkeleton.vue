<script setup>
import { FeedbackSkeleton } from "@vueda/feedback/skeleton";
import { cn } from "@vueda/utils/cn.js";
import { computed } from "vue";

/**
 * A skeleton placeholder for a sidebar menu item while content is loading.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** Whether to show an icon-sized skeleton on the left. */
    showIcon: { type: Boolean, default: false },
});

const width = computed(() => `${Math.floor(Math.random() * 40) + 50}%`);
</script>

<template>
    <div
        data-slot="sidebar-menu-skeleton"
        data-sidebar="menu-skeleton"
        :class="cn('flex h-8 items-center gap-2 rounded-md px-2', props.class)"
    >
        <FeedbackSkeleton v-if="showIcon" class="size-4 rounded-md" data-sidebar="menu-skeleton-icon" />

        <FeedbackSkeleton
            class="h-4 max-w-(--skeleton-width) flex-1"
            data-sidebar="menu-skeleton-text"
            :style="{ '--skeleton-width': width }"
        />
    </div>
</template>
