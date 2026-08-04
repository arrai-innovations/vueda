/**
 * @module theme/vueda-tailwind/display/LoadingHeartbeatStrip.theme
 *
 * Per-component theme registration for LoadingHeartbeatStrip. Imported as a side effect by
 * LoadingHeartbeatStrip.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * LoadingHeartbeatStrip displays request identity, elapsed time, dependency count, and heartbeat status in one mono row. It separates the default and slow-path dots so loading state tone remains customizable.
     */
    LoadingHeartbeatStrip: {
        /** Mono status row that separates request identity from live loading state. */
        root: {
            class: [
                "flex items-center justify-between gap-4",
                "font-mono text-[11px] leading-none text-muted-foreground",
            ],
        },
        /** Truncated request identifier group on the leading side of the strip. */
        id: {
            class: ["flex items-center gap-1.5 min-w-0 shrink truncate"],
        },
        /** Trailing status group for dependency count and heartbeat dot. */
        status: {
            class: ["flex items-center gap-1.5 shrink-0"],
        },
        /** Default heartbeat dot using the primary loading tint. */
        dot: {
            class: ["inline-block w-1.5 h-1.5 rounded-full bg-primary text-primary", "animate-vueda-heartbeat-pulse"],
        },
        /** Slow-path heartbeat dot using the warning tint. */
        dotSlow: {
            class: ["inline-block w-1.5 h-1.5 rounded-full bg-warning text-warning", "animate-vueda-heartbeat-pulse"],
        },
    },
});
