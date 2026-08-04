<script setup>
import "@vueda/theme/vueda-tailwind/display/TriedUrlCallout.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * Small bordered callout surfacing the URL path or action key that the user
 * attempted, with bad segments tinted destructive. Used in `ViewNotFound` and
 * `ViewActionNotFound` to ground the suggestion list without explaining the
 * typo in prose.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Label column text shown in the 88 px uppercase eyebrow column.
     * Typical values: "You tried", "Action key".
     */
    label: {
        type: String,
        default: "You tried",
    },
    /**
     * Value segments. Each entry renders an inline `<span>`; `bad: true` tints
     * the span with `text-destructive` so it reads as the error signal against
     * the faded non-bad segments.
     *
     * @type {{ text: string, bad?: boolean }[]}
     */
    segments: {
        type: Array,
        default: () => [],
    },
    /**
     * Additional CSS classes applied to the root element.
     *
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("TriedUrlCallout", props);
</script>

<template>
    <div
        data-slot="tried-url-callout"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        data-qa="tried-url-callout-root"
    >
        <span :class="theme('label')" data-qa="tried-url-callout-label">{{ label }}</span>
        <span :class="theme('value')" data-qa="tried-url-callout-value">
            <template v-for="(seg, i) in segments" :key="i">
                <span v-if="seg.bad" class="text-destructive" data-qa="tried-url-callout-segment-bad">{{
                    seg.text
                }}</span>
                <span v-else :class="theme('fade')" data-qa="tried-url-callout-segment">{{ seg.text }}</span>
            </template>
        </span>
    </div>
</template>
