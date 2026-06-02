<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * Two-column `dl` grid debug strip for system views. Each row renders a
 * 10 px uppercase sans label (`dt`) paired with an 11 px value (`dd`).
 * Intended as a copy-paste footer inside `SystemMessageCard` body slots so
 * an operator can paste request id, route, and session into a ticket.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Row data. Each entry renders one `dt` (label) / `dd` (value) pair.
     *
     * @type {{ label: string, value: string }[]}
     */
    rows: {
        type: Array,
        default: () => [],
    },
    /**
     * Render values in a monospace font. Defaults to `true`.
     */
    mono: {
        type: Boolean,
        default: true,
    },
    /**
     * Additional CSS classes applied to the root element.
     *
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("DiagnosticStrip", props);
</script>

<template>
    <dl
        data-slot="diagnostic-strip"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        data-qa="diagnostic-strip-root"
    >
        <template v-for="row in rows" :key="row.label">
            <dt :class="theme('dt')" data-qa="diagnostic-strip-dt">{{ row.label }}</dt>
            <dd :class="[theme('dd'), { 'font-mono': mono }]" data-qa="diagnostic-strip-dd">{{ row.value }}</dd>
        </template>
    </dl>
</template>
