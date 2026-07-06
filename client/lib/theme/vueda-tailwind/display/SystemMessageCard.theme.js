/**
 * @module theme/vueda-tailwind/display/SystemMessageCard.theme
 *
 * Per-component theme registration for SystemMessageCard. Imported as a side effect by
 * SystemMessageCard.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire display family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * SystemMessageCard provides the centered card chassis for system-level states such as not found, loading, and deactivate screens. Its named group scope routes tone-specific crest styling from the root.
     */
    SystemMessageCard: {
        /** Centered card chassis with the named tone group used by crest descendants. */
        root: {
            class: [
                "group/system-message-card",
                "max-w-[460px] w-full",
                "flex flex-col gap-5",
                "rounded-vueda-card hairline hairline-border bg-card",
                "px-8 pt-8 pb-7",
                "shadow-[0_1px_0_0_color-mix(in_oklab,var(--foreground)_4%,transparent)]",
            ],
        },
        /** Header row containing the icon tile, meta column, and optional status code, separated from the body by a bottom rule. */
        crest: {
            class: ["flex items-start gap-3 pb-4 border-b-hairline"],
        },
        /** Tone-tinted icon tile routed through the system-message group scope. */
        crestIcon: {
            class: [
                "flex items-center justify-center shrink-0",
                "w-9 h-9 rounded-[4px]",
                "text-[18px] leading-none",
                // info + loading: primary blue soft tint
                "group-data-[tone=info]/system-message-card:bg-primary/[0.12]",
                "group-data-[tone=info]/system-message-card:text-primary",
                "group-data-[tone=loading]/system-message-card:bg-primary/[0.12]",
                "group-data-[tone=loading]/system-message-card:text-primary",
                // warning: amber soft tint
                "group-data-[tone=warning]/system-message-card:bg-warning/[0.14]",
                "group-data-[tone=warning]/system-message-card:text-warning",
                // danger: red soft tint
                "group-data-[tone=danger]/system-message-card:bg-destructive/[0.12]",
                "group-data-[tone=danger]/system-message-card:text-destructive",
            ],
        },
        /** Meta text column inside the crest, flexing between icon and optional code. */
        crestMeta: {
            class: ["flex flex-col justify-center gap-0.5 min-w-0 flex-1"],
        },
        /** Uppercase eyebrow for the system-message category. */
        crestEyebrow: {
            class: ["text-[10px] font-semibold uppercase tracking-[0.06em]", "text-muted-foreground leading-none"],
        },
        /** Mono line for a machine-readable path, action kind, or route label. */
        crestKind: {
            class: ["font-mono text-[12px] font-medium leading-[1.3] text-foreground"],
        },
        /** Optional trailing status code, rendered as an oversized mono numeral. */
        crestCode: {
            class: [
                "font-mono text-[36px] font-semibold leading-none tabular-nums",
                "text-foreground/50 shrink-0 self-center",
            ],
        },
        /** Body stack for explanatory copy, diagnostics, and embedded display primitives. */
        body: {
            class: ["flex flex-col gap-3"],
        },
        /** Optional action row below the body content. */
        actions: {
            class: ["flex items-center gap-2"],
        },
    },
});
