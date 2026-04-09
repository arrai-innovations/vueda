<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { Toaster as Sonner } from "vue-sonner";

/**
 * A toast notification container built on vue-sonner, providing styled toast popups
 * with icon slots for success, info, warning, error, loading, and close states.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The position of the toaster on screen. */
    position: { type: String, default: undefined },
    /** Whether toasts should be shown with a close button. */
    closeButton: { type: Boolean, default: undefined },
    /** Whether rich colors should be used. */
    richColors: { type: Boolean, default: undefined },
    /** Whether the newest toast should appear on top. */
    invert: { type: Boolean, default: undefined },
    /** Maximum number of toasts shown at once. */
    visibleToasts: { type: Number, default: undefined },
    /** Duration in ms before a toast auto-dismisses. */
    duration: { type: Number, default: undefined },
    /** Gap between toasts in pixels. */
    gap: { type: Number, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
});

const theme = useTheme("FeedbackToaster", props);
</script>

<template>
    <Sonner
        data-slot="toaster"
        :class="[theme('root'), props.class]"
        :style="{
            '--normal-bg': 'var(--popover)',
            '--normal-text': 'var(--popover-foreground)',
            '--normal-border': 'var(--border)',
            '--border-radius': 'var(--radius)',
        }"
        :position="position"
        :close-button="closeButton"
        :rich-colors="richColors"
        :invert="invert"
        :visible-toasts="visibleToasts"
        :duration="duration"
        :gap="gap"
        :as="as"
    >
        <template #success-icon>
            <!-- Replaces the success toast icon; receives no slot props. -->
            <slot name="success-icon"><span aria-hidden="true" class="select-none">✓</span></slot>
        </template>
        <template #info-icon>
            <!-- Replaces the info toast icon; receives no slot props. -->
            <slot name="info-icon"><span aria-hidden="true" class="select-none">ℹ</span></slot>
        </template>
        <template #warning-icon>
            <!-- Replaces the warning toast icon; receives no slot props. -->
            <slot name="warning-icon"><span aria-hidden="true" class="select-none">⚠</span></slot>
        </template>
        <template #error-icon>
            <!-- Replaces the error toast icon; receives no slot props. -->
            <slot name="error-icon"><span aria-hidden="true" class="select-none">✕</span></slot>
        </template>
        <template #loading-icon>
            <!-- Replaces the loading toast icon; receives no slot props. -->
            <slot name="loading-icon"
                ><span aria-hidden="true" class="inline-block animate-spin select-none">◌</span></slot
            >
        </template>
        <template #close-icon>
            <!-- Replaces the close toast icon; receives no slot props. -->
            <slot name="close-icon"><span aria-hidden="true" class="select-none">✕</span></slot>
        </template>
    </Sonner>
</template>
