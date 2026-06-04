<script setup>
import Sheet from "@vueda/shell/sheet/Sheet.vue";
import SheetContent from "@vueda/shell/sheet/SheetContent.vue";
import SheetDescription from "@vueda/shell/sheet/SheetDescription.vue";
import SheetHeader from "@vueda/shell/sheet/SheetHeader.vue";
import SheetTitle from "@vueda/shell/sheet/SheetTitle.vue";
import "@vueda/theme/vueda-tailwind/navigation/Sidebar.theme.js";
import { useSidebar } from "@vueda/use/useSidebar.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactive, toRef } from "vue";

/**
 * The main sidebar container. Renders as an off-canvas sheet on mobile and a collapsible panel on desktop.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The side of the viewport the sidebar appears on. */
    side: { type: String, default: "left" },
    /** The visual style variant. */
    variant: { type: String, default: "sidebar" },
    /** The collapse behavior. */
    collapsible: { type: String, default: "offcanvas" },
});

const theme = useTheme(
    "Sidebar",
    props,
    reactive({
        variant: toRef(props, "variant"),
        side: toRef(props, "side"),
        collapsible: toRef(props, "collapsible"),
    }),
);

const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
</script>

<template>
    <!-- TODO: theme.hideStyle requires a single themed root -->
    <div v-if="collapsible === 'none'" data-slot="sidebar" :class="[theme('rootNone'), props.class]" v-bind="$attrs">
        <slot />
    </div>

    <Sheet v-else-if="isMobile" :open="openMobile" v-bind="$attrs" @update:open="setOpenMobile">
        <SheetContent
            data-sidebar="sidebar"
            data-slot="sidebar"
            data-mobile="true"
            :side="side"
            class="bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden"
            :style="{ '--sidebar-width': 'var(--vueda-sidebar-width-mobile)' }"
        >
            <SheetHeader class="sr-only">
                <SheetTitle>Sidebar</SheetTitle>
                <SheetDescription>Displays the mobile sidebar.</SheetDescription>
            </SheetHeader>
            <div class="flex h-full w-full flex-col">
                <slot />
            </div>
        </SheetContent>
    </Sheet>

    <div
        v-else
        class="group peer text-sidebar-foreground hidden md:block"
        data-slot="sidebar"
        :data-state="state"
        :data-collapsible="state === 'collapsed' ? collapsible : ''"
        :data-variant="variant"
        :data-side="side"
    >
        <div :class="theme('spacer')" />
        <div :class="[theme('panel'), props.class]" v-bind="$attrs">
            <div
                data-sidebar="sidebar"
                class="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
            >
                <slot />
            </div>
        </div>
    </div>
</template>
