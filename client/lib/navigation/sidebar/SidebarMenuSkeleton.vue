<script setup>
import Skeleton from "@vueda/feedback/skeleton/Skeleton.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed } from "vue";

/**
 * A skeleton placeholder for a sidebar menu item while content is loading.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** Whether to show an icon-sized skeleton on the left. */
    showIcon: { type: Boolean, default: false },
});

const theme = useTheme("SidebarMenuSkeleton", props);
const width = computed(() => `${Math.floor(Math.random() * 40) + 50}%`);
</script>

<template>
    <div
        data-slot="sidebar-menu-skeleton"
        data-sidebar="menu-skeleton"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <Skeleton v-if="showIcon" class="size-4 rounded-vueda-checkbox" data-sidebar="menu-skeleton-icon" />

        <Skeleton
            class="h-4 max-w-(--skeleton-width) flex-1"
            data-sidebar="menu-skeleton-text"
            :style="{ '--skeleton-width': width }"
        />
    </div>
</template>
