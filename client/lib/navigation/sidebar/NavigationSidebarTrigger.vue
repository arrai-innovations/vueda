<script setup>
import { useSidebar } from "./utils.js";
import { ControlButton } from "@vueda/controls/button";
import { cn } from "@vueda/utils/cn.js";
import { PanelLeft } from "lucide-vue-next";

/**
 * A button that toggles the sidebar open or closed.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const { toggleSidebar } = useSidebar();
</script>

<template>
    <ControlButton
        data-sidebar="trigger"
        data-slot="sidebar-trigger"
        variant="ghost"
        size="icon"
        :class="cn('h-7 w-7', props.class)"
        @click="toggleSidebar"
    >
        <PanelLeft />
        <span class="sr-only">Toggle Sidebar</span>
    </ControlButton>
</template>
