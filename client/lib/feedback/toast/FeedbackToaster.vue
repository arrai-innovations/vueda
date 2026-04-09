<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon, XIcon } from "lucide-vue-next";
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
            <CircleCheckIcon class="size-4" />
        </template>
        <template #info-icon>
            <InfoIcon class="size-4" />
        </template>
        <template #warning-icon>
            <TriangleAlertIcon class="size-4" />
        </template>
        <template #error-icon>
            <OctagonXIcon class="size-4" />
        </template>
        <template #loading-icon>
            <div>
                <Loader2Icon class="size-4 animate-spin" />
            </div>
        </template>
        <template #close-icon>
            <XIcon class="size-4" />
        </template>
    </Sonner>
</template>
