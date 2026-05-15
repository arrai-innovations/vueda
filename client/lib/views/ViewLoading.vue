<script setup>
import LoadingSpinnerBlock from "@vueda/components/LoadingSpinnerBlock.vue";

/**
 * Full-page loading placeholder that displays a centered spinner. Use it as a route-level fallback while
 * async data or components are being resolved. The `slowAfterMs` prop (defaulting to the
 * `--vueda-loading-slow-ms` CSS token) controls when the slow-path warning tone activates.
 */
defineOptions({});

defineProps({
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
</script>

<template>
    <div>
        <div class="flex w-full h-full items-center justify-center"><loading-spinner-block class="w-1/3 h-1/3" /></div>
    </div>
</template>
