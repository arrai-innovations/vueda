<script setup>
import "@vueda/theme/vueda-tailwind/feedback/Sonner.theme.js";
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { Toaster as Sonner } from "vue-sonner";

/**
 * A toast notification container built on vue-sonner, providing styled toast popups
 * with icon slots for success, info, warning, error, loading, and close states.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
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

const theme = useTheme("Sonner", props);
const icon = useIcons("Sonner");
</script>

<template>
    <Sonner
        data-slot="toaster"
        :class="[theme('root'), props.class]"
        :style="[
            {
                '--normal-bg': 'var(--popover)',
                '--normal-text': 'var(--popover-foreground)',
                '--normal-border': 'var(--border)',
                '--border-radius': 'var(--vueda-card-radius)',
            },
            theme.hideStyle?.value,
        ]"
        :position="position"
        :close-button="closeButton"
        :rich-colors="richColors"
        :invert="invert"
        :visible-toasts="visibleToasts"
        :duration="duration"
        :gap="gap"
        :as="as"
    >
        <template v-if="$slots['success-icon'] || icon('check')" #success-icon>
            <!-- Replaces the success toast icon; receives no slot props. -->
            <slot name="success-icon">
                <component :is="icon('check').component" v-bind="icon('check').props" aria-hidden="true" />
            </slot>
        </template>
        <template v-if="$slots['info-icon'] || icon('info')" #info-icon>
            <!-- Replaces the info toast icon; receives no slot props. -->
            <slot name="info-icon">
                <component :is="icon('info').component" v-bind="icon('info').props" aria-hidden="true" />
            </slot>
        </template>
        <template v-if="$slots['warning-icon'] || icon('triangleExclamation')" #warning-icon>
            <!-- Replaces the warning toast icon; receives no slot props. -->
            <slot name="warning-icon">
                <component
                    :is="icon('triangleExclamation').component"
                    v-bind="icon('triangleExclamation').props"
                    aria-hidden="true"
                />
            </slot>
        </template>
        <template v-if="$slots['error-icon'] || icon('close')" #error-icon>
            <!-- Replaces the error toast icon; receives no slot props. -->
            <slot name="error-icon">
                <component :is="icon('close').component" v-bind="icon('close').props" aria-hidden="true" />
            </slot>
        </template>
        <template v-if="$slots['loading-icon'] || icon('loading')" #loading-icon>
            <!-- Replaces the loading toast icon; receives no slot props. -->
            <slot name="loading-icon">
                <component :is="icon('loading').component" v-bind="icon('loading').props" aria-hidden="true" />
            </slot>
        </template>
        <template v-if="$slots['close-icon'] || icon('close')" #close-icon>
            <!-- Replaces the close toast icon; receives no slot props. -->
            <slot name="close-icon">
                <component :is="icon('close').component" v-bind="icon('close').props" aria-hidden="true" />
            </slot>
        </template>
    </Sonner>
</template>
