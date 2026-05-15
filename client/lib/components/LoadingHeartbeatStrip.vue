<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed } from "vue";

/**
 * Live-updating status footer for loading views. Renders a flex justify-between
 * strip with mono text: request id and elapsed time on the left, resolved/total
 * dependency count and a pulsing dot on the right. The dot animates a box-shadow
 * halo; `tone="slow"` flips it from primary blue to amber to signal an unusually
 * long wait.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Request identifier displayed on the left.
     */
    requestId: { type: String, default: undefined },
    /**
     * Elapsed time in milliseconds. Formatted as `ms` below 1000, `s` at or above.
     */
    elapsedMs: { type: Number, default: undefined },
    /**
     * Number of resolved dependencies.
     */
    resolved: { type: Number, default: undefined },
    /**
     * Total number of dependencies.
     */
    total: { type: Number, default: undefined },
    /**
     * Visual tone. `slow` flips the pulsing dot to amber.
     *
     * @type {'default'|'slow'}
     */
    tone: {
        type: String,
        default: "default",
        validator: (v) => ["default", "slow"].includes(v),
    },
    /**
     * Additional CSS classes applied to the root element.
     *
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("LoadingHeartbeatStrip", props);

const formattedElapsed = computed(() => {
    if (props.elapsedMs === undefined) return undefined;
    if (props.elapsedMs < 1000) return `${props.elapsedMs}ms`;
    return `${(props.elapsedMs / 1000).toFixed(1)}s`;
});

const showSeparator = computed(() => !!props.requestId && formattedElapsed.value !== undefined);

const dotClass = computed(() => (props.tone === "slow" ? theme("dotSlow") : theme("dot")));
</script>

<template>
    <div
        data-slot="loading-heartbeat-strip"
        :data-tone="tone"
        :class="[theme('root'), props.class]"
        data-qa="loading-heartbeat-strip-root"
    >
        <span :class="theme('id')" data-qa="loading-heartbeat-strip-id">
            <template v-if="requestId">{{ requestId }}</template>
            <template v-if="showSeparator"> · </template>
            <template v-if="formattedElapsed !== undefined">{{ formattedElapsed }}</template>
        </span>
        <span :class="theme('status')" data-qa="loading-heartbeat-strip-status">
            <template v-if="resolved !== undefined && total !== undefined">{{ resolved }}/{{ total }}</template>
            <span :class="dotClass" data-qa="loading-heartbeat-strip-dot" />
        </span>
    </div>
</template>
