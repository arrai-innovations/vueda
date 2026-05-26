<script setup>
import UserAvatar from "@vueda/display/avatar/UserAvatar.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * Sidebar footer user block: 32 px avatar chip + name + role + a slot for a
 * 20 px ghost kebab trigger. Composes `UserAvatar` with the `sidebar` tone so
 * the chip belongs to the sidebar surface rather than the primary palette.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Full name; passed through to `UserAvatar` for initials derivation and used as the visible name line. */
    name: { type: String, default: "" },
    /** Role / subtitle shown under the name. Hidden when empty. */
    role: { type: String, default: "" },
    /** Explicit initials; passed through to `UserAvatar`. */
    initials: { type: String, default: undefined },
    /**
     * Additional CSS classes applied to the root.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("SidebarUserBlock", props);
</script>

<template>
    <div data-slot="sidebar-user-block" :class="[theme('root'), props.class]">
        <UserAvatar :name="name" :initials="initials" :size="32" tone="sidebar" />
        <div :class="theme('text')">
            <span :class="theme('name')">{{ name }}</span>
            <span v-if="role" :class="theme('role')">{{ role }}</span>
        </div>
        <!-- @slot kebab Trigger element for the user-block account menu (typically a ghost button + ellipsis icon). -->
        <slot name="kebab" />
    </div>
</template>
