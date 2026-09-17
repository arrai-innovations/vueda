<script setup>
import LoadingHeartbeatStrip from "@vueda/display/loading/LoadingHeartbeatStrip.vue";
import "@vueda/theme/vueda-tailwind/views/ViewLoading.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed, ref, watch } from "vue";

/**
 * Compact loading status for route-level async resolution. Shows a loading icon
 * and label, with optional request details and dependency progress. After
 * `slowAfterMs`, shows a slow-load message and the optional `slow-actions` slot.
 */
defineOptions({});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
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
            if (typeof window === "undefined") {
                return 3000;
            }
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
const icon = useIcons("ViewLoading", props);
const isActive = useIsActive();

const elapsedMs = ref(0);
watch(isActive, (active, _, onCleanup) => {
    if (!active) {
        return;
    }
    const intervalId = setInterval(() => {
        elapsedMs.value += 100;
    }, 100);
    onCleanup(() => clearInterval(intervalId));
});

const isSlow = computed(() => elapsedMs.value >= props.slowAfterMs);
const statusIconName = computed(() => (isSlow.value ? "hourglass" : "loading"));
const statusIcon = computed(() => icon(statusIconName.value));
const statusIconProps = computed(() => ({
    ...statusIcon.value?.props,
    class: [statusIcon.value?.props?.class, isSlow.value ? theme("slowCrest") : theme("crest")],
}));
const heartbeatTone = computed(() => (isSlow.value ? "slow" : "default"));

const crestKind = computed(() => {
    const parts = [props.verb, props.path].filter(Boolean);
    return parts.length ? parts.join(" ") : undefined;
});
</script>

<template>
    <div :class="theme('root')" :style="theme.hideStyle?.value" data-qa="view-loading-root">
        <div :class="theme('content')">
            <div :class="theme('status')" role="status" aria-live="polite" data-qa="view-loading-status">
                <component :is="statusIcon.component" v-if="statusIcon" v-bind="statusIconProps" aria-hidden="true" />
                <span v-if="isSlow" :class="theme('slowTitle')" data-qa="view-loading-slow-title">
                    This is taking longer than usual
                </span>
                <span v-else :class="theme('bodyRowText')" data-qa="view-loading-name">{{ name || "Loading…" }}</span>
            </div>
            <div v-if="context || crestKind || (isSlow && slowBlurb)" :class="theme('bodyRow')">
                <span v-if="context" :class="theme('bodyRowSub')" data-qa="view-loading-context">{{ context }}</span>
                <span v-if="crestKind" :class="theme('request')" data-qa="view-loading-request">{{ crestKind }}</span>
                <span v-if="isSlow && slowBlurb" :class="theme('slowBlurb')" data-qa="view-loading-slow-blurb">{{
                    slowBlurb
                }}</span>
            </div>
            <loading-heartbeat-strip
                v-if="requestId || dependencies"
                :class="theme('heartbeat')"
                :request-id="requestId"
                :elapsed-ms="elapsedMs"
                :resolved="dependencies?.resolved"
                :total="dependencies?.total"
                :tone="heartbeatTone"
                data-qa="view-loading-heartbeat"
            />
            <div v-if="isSlow && $slots['slow-actions']" :class="theme('actions')">
                <!-- @slot slow-actions Buttons shown once the slow threshold is exceeded (e.g. Cancel, View queue). -->
                <slot name="slow-actions" />
            </div>
        </div>
    </div>
</template>
