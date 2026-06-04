<script setup>
import LoadingHeartbeatStrip from "@vueda/components/LoadingHeartbeatStrip.vue";
import LoadingSkeletonGhost from "@vueda/components/LoadingSkeletonGhost.vue";
import LoadingSpinnerBlock from "@vueda/components/LoadingSpinnerBlock.vue";
import SystemMessageCard from "@vueda/components/SystemMessageCard.vue";
import "@vueda/theme/vueda-tailwind/views/ViewLoading.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed, onMounted, onUnmounted, ref } from "vue";

/**
 * Full-page loading placeholder for route-level async resolution. Composes a
 * `SystemMessageCard(tone="loading")` with a spinner crest, an optional verb-path
 * crest label, a body row for what is loading and one-line context, a
 * `LoadingSkeletonGhost` claiming layout space, and a `LoadingHeartbeatStrip`
 * showing elapsed time and dependency progress. Once `elapsedMs` exceeds
 * `slowAfterMs` the card flips to `tone="warning"`, the spinner swaps for an
 * hourglass, the heartbeat dot turns amber, and the slow-path body is shown.
 * A `slow-actions` slot populates the card actions footer (e.g. Cancel, View queue).
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** What is being loaded (e.g. "Loading customer record"). */
    name: { type: String, default: undefined },
    /** HTTP verb of the in-flight request (e.g. "GET"). */
    verb: { type: String, default: undefined },
    /** Route path of the in-flight request (e.g. "/crm/customers/4218"). */
    path: { type: String, default: undefined },
    /** One-line context beneath the name (e.g. "Northwind Logistics · 14 invoices · 3 contacts"). */
    context: { type: String, default: undefined },
    /** Request identifier forwarded to LoadingHeartbeatStrip. */
    requestId: { type: String, default: undefined },
    /**
     * Resolved and total dependency counts forwarded to LoadingHeartbeatStrip.
     *
     * @type {{ resolved: number, total: number }|undefined}
     */
    dependencies: { type: Object, default: undefined },
    /**
     * Route-specific explanation shown in the slow-path blurb once the wait exceeds `slowAfterMs`.
     * E.g. "The aging report aggregates 14 k invoices across 380 customers."
     */
    slowBlurb: { type: String, default: undefined },
    /**
     * Milliseconds before the slow-path warning tone activates. Defaults to the
     * `--vueda-loading-slow-ms` CSS token (3000ms). Override per-route for known-slow
     * views (reports, exports) to avoid a premature flip.
     */
    slowAfterMs: {
        type: Number,
        default: () => {
            if (typeof window === "undefined") return 3000;
            const raw = window
                .getComputedStyle(document.documentElement)
                .getPropertyValue("--vueda-loading-slow-ms")
                .trim();
            const parsed = parseInt(raw, 10);
            return Number.isFinite(parsed) ? parsed : 3000;
        },
    },
});

const theme = useTheme("ViewLoading", props);

const elapsedMs = ref(0);
let intervalId = null;

onMounted(() => {
    intervalId = setInterval(() => {
        elapsedMs.value += 100;
    }, 100);
});

onUnmounted(() => {
    clearInterval(intervalId);
});

const isSlow = computed(() => elapsedMs.value >= props.slowAfterMs);
const cardTone = computed(() => (isSlow.value ? "warning" : "loading"));
const heartbeatTone = computed(() => (isSlow.value ? "slow" : "default"));

const crestKind = computed(() => {
    const parts = [props.verb, props.path].filter(Boolean);
    return parts.length ? parts.join(" ") : undefined;
});
</script>

<template>
    <div :class="theme('root')" :style="theme.hideStyle?.value" data-qa="view-loading-root">
        <system-message-card :tone="cardTone" data-qa="view-loading-card">
            <template #crest-icon>
                <loading-spinner-block v-if="!isSlow" :class="theme('crest')" aria-hidden="true" />
                <span v-else :class="theme('slowCrest')" aria-hidden="true" role="img" aria-label="slow">⏳</span>
            </template>
            <template v-if="crestKind" #crest-kind>{{ crestKind }}</template>

            <div v-if="!isSlow && (name || context)" :class="theme('bodyRow')" data-qa="view-loading-body-row">
                <span v-if="name" :class="theme('bodyRowText')" data-qa="view-loading-name">{{ name }}</span>
                <span v-if="context" :class="theme('bodyRowSub')" data-qa="view-loading-context">{{ context }}</span>
            </div>
            <div v-if="isSlow" :class="theme('bodyRow')" data-qa="view-loading-slow-body">
                <span :class="theme('slowTitle')" data-qa="view-loading-slow-title"
                    >This is taking longer than usual</span
                >
                <span v-if="slowBlurb" :class="theme('slowBlurb')" data-qa="view-loading-slow-blurb">{{
                    slowBlurb
                }}</span>
            </div>

            <loading-skeleton-ghost :class="theme('skeleton')" data-qa="view-loading-skeleton" />
            <loading-heartbeat-strip
                :class="theme('heartbeat')"
                :request-id="requestId"
                :elapsed-ms="elapsedMs"
                :resolved="dependencies?.resolved"
                :total="dependencies?.total"
                :tone="heartbeatTone"
                data-qa="view-loading-heartbeat"
            />

            <!-- @slot slow-actions Buttons shown once the slow threshold is exceeded (e.g. Cancel, View queue). -->
            <template v-if="isSlow && $slots['slow-actions']" #actions>
                <slot name="slow-actions" />
            </template>
        </system-message-card>
    </div>
</template>
