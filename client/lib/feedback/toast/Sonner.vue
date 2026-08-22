<script setup>
// Loaded after vue-sonner's stylesheet so its equal-specificity rules win:
// swaps vue-sonner's real border for a DPR-aware inset hairline (no chromatic
// fringing on rich-colour edges) and its drop-only shadow for the VUEDA
// popover elevation. See Sonner.css.
import "@vueda/feedback/toast/Sonner.css";
import "@vueda/theme/vueda-tailwind/feedback/Sonner.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
// vue-sonner ships its base stylesheet separately; without it the Toaster has no
// fixed positioning or surface styling (toasts render in document flow, unstyled).
// The theme below only layers VUEDA tokens on top of these base rules.
import { Toaster as Sonner } from "vue-sonner";
import "vue-sonner/style.css";

/**
 * A toast notification container built on vue-sonner, providing styled toast popups
 * with registry-backed icons for success, info, warning, error, loading, and close states.
 */
defineOptions({});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The position of the toaster on screen. */
    position: { type: String, default: undefined },
    /**
     * Whether toasts should be shown with a close button. Defaults to `true`:
     * without it, drag-to-dismiss is the only way to close a toast early, and
     * that gesture has no visual affordance.
     */
    closeButton: { type: Boolean, default: true },
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
const icon = useIcons("Sonner", props);
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
                // Body copy and the cancel button's fill. vue-sonner routes these through
                // --description-text / --cancel-bg as of the 2.0.11 fork; before that they were
                // literals no variable could reach, which left the description stuck at the
                // upstream near-black once --normal-bg flipped to the dark popover.
                '--description-text': 'var(--muted-foreground)',
                '--cancel-bg': 'var(--secondary)',
                // richColors cells: mixed against --popover rather than transparent, so the
                // filled surface stays opaque like every other floating overlay (Popover,
                // Dialog) instead of true alpha over unpredictable page content underneath.
                '--success-bg': 'color-mix(in oklab, var(--success) 10%, var(--popover))',
                '--success-border': 'color-mix(in oklab, var(--success) 50%, var(--popover))',
                '--success-text': 'var(--success)',
                '--info-bg': 'color-mix(in oklab, var(--info) 10%, var(--popover))',
                '--info-border': 'color-mix(in oklab, var(--info) 50%, var(--popover))',
                '--info-text': 'var(--info)',
                '--warning-bg': 'color-mix(in oklab, var(--warning) 10%, var(--popover))',
                '--warning-border': 'color-mix(in oklab, var(--warning) 50%, var(--popover))',
                '--warning-text': 'var(--warning)',
                '--error-bg': 'color-mix(in oklab, var(--destructive) 10%, var(--popover))',
                '--error-border': 'color-mix(in oklab, var(--destructive) 50%, var(--popover))',
                '--error-text': 'var(--destructive)',
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
        <template v-if="icon('check')" #success-icon>
            <component :is="icon('check').component" v-bind="icon('check').props" aria-hidden="true" />
        </template>
        <template v-if="icon('info')" #info-icon>
            <component :is="icon('info').component" v-bind="icon('info').props" aria-hidden="true" />
        </template>
        <template v-if="icon('triangleExclamation')" #warning-icon>
            <component
                :is="icon('triangleExclamation').component"
                v-bind="icon('triangleExclamation').props"
                aria-hidden="true"
            />
        </template>
        <template v-if="icon('close')" #error-icon>
            <component :is="icon('close').component" v-bind="icon('close').props" aria-hidden="true" />
        </template>
        <template v-if="icon('loading')" #loading-icon>
            <component :is="icon('loading').component" v-bind="icon('loading').props" aria-hidden="true" />
        </template>
        <template v-if="icon('close')" #close-icon>
            <component :is="icon('close').component" v-bind="icon('close').props" aria-hidden="true" />
        </template>
    </Sonner>
</template>
