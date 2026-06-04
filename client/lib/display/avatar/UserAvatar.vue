<script setup>
import "@vueda/theme/vueda-tailwind/display/UserAvatar.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed, reactive, toRef } from "vue";

/**
 * Initials chip representing a user. Composed by `SidebarUserBlock` at 32 px
 * and `ViewHistoryList`'s history-user column at 22 px. Initials-only for now;
 * a `src` photo prop is reserved for a later iteration.
 *
 * Initials algorithm: when `name` has two or more whitespace-separated tokens,
 * uses the first character of the first and last tokens. Otherwise uses the
 * first two characters of the single token. Always uppercased. An explicit
 * `initials` prop, when set, takes precedence and is uppercased verbatim.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Full name; used to derive initials when `initials` is not provided. */
    name: { type: String, default: "" },
    /** Explicit initials; takes precedence over derivation from `name`. */
    initials: { type: String, default: undefined },
    /** Pixel size of the chip (width and height). */
    size: { type: Number, default: 32 },
    /**
     * Color tone.
     * @type {('primary'|'sidebar')}
     */
    tone: { type: String, default: "primary" },
    /**
     * Additional CSS classes applied to the root.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const resolvedInitials = computed(() => {
    if (props.initials !== undefined && props.initials !== null && props.initials !== "") {
        return String(props.initials).toUpperCase();
    }
    const trimmed = (props.name || "").trim();
    if (!trimmed) return "";
    const tokens = trimmed.split(/\s+/);
    if (tokens.length >= 2) {
        return (tokens[0][0] + tokens[tokens.length - 1][0]).toUpperCase();
    }
    return tokens[0].slice(0, 2).toUpperCase();
});

const sizeStyle = computed(() => ({
    width: `${props.size}px`,
    height: `${props.size}px`,
    fontSize: `${Math.max(10, Math.round(props.size * 0.45))}px`,
}));

const theme = useTheme("UserAvatar", props, reactive({ tone: toRef(props, "tone") }));
</script>

<template>
    <span
        data-slot="user-avatar"
        :data-tone="tone"
        :class="[theme('root'), props.class]"
        :style="[sizeStyle, theme.hideStyle?.value]"
        :aria-label="name || undefined"
    >
        <span :class="theme('initials')" aria-hidden="true">{{ resolvedInitials }}</span>
    </span>
</template>
