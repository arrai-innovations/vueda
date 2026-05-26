<script setup>
import TooltipProvider from "@vueda/shell/tooltip/TooltipProvider.vue";
import { provideSidebarContext } from "@vueda/use/useSidebar.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { SIDEBAR_COOKIE_MAX_AGE, SIDEBAR_COOKIE_NAME, SIDEBAR_KEYBOARD_SHORTCUT } from "@vueda/utils/constants.js";
import { defaultDocument, useEventListener, useMediaQuery, useVModel } from "@vueuse/core";
import { computed, ref } from "vue";

/**
 * Provider component that manages sidebar state and provides context to all child sidebar components.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** Whether the sidebar is open by default. Reads from cookie if available. */
    defaultOpen: {
        type: Boolean,
        default: () => !defaultDocument?.cookie.includes(`${SIDEBAR_COOKIE_NAME}=false`),
    },
    /** Controlled open state. */
    open: { type: Boolean, default: undefined },
});
const emits = defineEmits({
    /** Emitted when the open state changes. */
    "update:open": null,
});

const theme = useTheme("SidebarProvider", props);

const isMobile = useMediaQuery("(max-width: 768px)");
const openMobile = ref(false);

const open = useVModel(props, "open", emits, {
    defaultValue: props.defaultOpen ?? false,
    passive: props.open === undefined,
});

function setOpen(value) {
    open.value = value;
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${open.value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
}

function setOpenMobile(value) {
    openMobile.value = value;
}

function toggleSidebar() {
    return isMobile.value ? setOpenMobile(!openMobile.value) : setOpen(!open.value);
}

useEventListener("keydown", (event) => {
    if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
    }
});

const state = computed(() => (open.value ? "expanded" : "collapsed"));

provideSidebarContext({
    state,
    open,
    setOpen,
    isMobile,
    openMobile,
    setOpenMobile,
    toggleSidebar,
});
</script>

<template>
    <TooltipProvider :delay-duration="0">
        <div
            data-slot="sidebar-wrapper"
            :style="{
                '--sidebar-width': 'var(--vueda-sidebar-width)',
                '--sidebar-width-icon': 'var(--vueda-sidebar-width-icon)',
            }"
            :class="[theme('root'), props.class]"
            v-bind="$attrs"
        >
            <slot />
        </div>
    </TooltipProvider>
</template>
