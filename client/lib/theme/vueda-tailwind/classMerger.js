/**
 * @module theme/vueda-tailwind/classMerger
 * @description Tailwind conflict rules extended for utilities in base.css.
 */
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Merge active class names, keeping the later utility in each conflict group.
 * @type {(classes: string) => string}
 */
export const mergeClasses = extendTailwindMerge({
    extend: {
        theme: {
            text: ["body", "heading", "title", "display"],
            animate: ["caret-blink", "vueda-progress-slide", "vueda-heartbeat-pulse", "vueda-skeleton-shimmer"],
            radius: [
                "vueda-control",
                "vueda-field",
                "vueda-checkbox",
                "vueda-card",
                "vueda-modal",
                "vueda-pill",
                "vueda-cal-day",
            ],
            shadow: ["vueda-control", "vueda-card", "vueda-popover", "vueda-overlay"],
            spacing: [
                "vueda-control",
                "vueda-control-sm",
                "vueda-control-lg",
                "vueda-control-px",
                "vueda-control-px-sm",
                "vueda-control-px-lg",
            ],
        },
        classGroups: {
            transition: ["no-transition"],
            h: ["h-hairline"],
            w: ["w-hairline"],
            "border-w": ["border-hairline"],
            "border-w-x": ["border-x-hairline"],
            "border-w-y": ["border-y-hairline"],
            "border-w-t": ["border-t-hairline"],
            "border-w-r": ["border-r-hairline"],
            "border-w-b": ["border-b-hairline"],
            "border-w-l": ["border-l-hairline"],
            "vueda-edge": ["hairline", "field-line"],
            "vueda-overlay": ["overlay-hairline"],
            "vueda-edge-color": [
                {
                    hairline: [
                        "input",
                        "ring",
                        "primary",
                        "foreground",
                        "warning",
                        "destructive",
                        "border",
                        "border-strong",
                    ],
                },
            ],
            "vueda-elevation": ["overlay-hairline-elevated"],
            "vueda-focus-outline": ["focus-ring"],
            "vueda-focus-shadow": ["focus-ring-shadow"],
            "vueda-focus-color": ["focus-ring-destructive", "focus-ring-sidebar", "focus-ring-shadow-destructive"],
        },
        conflictingClassGroups: {
            // Edge and focus shadows deliberately compose through separate CSS
            // variables. Keep both, but let an ordinary shadow replace them.
            shadow: ["vueda-edge", "vueda-overlay", "vueda-focus-shadow"],
            "vueda-edge": ["shadow", "vueda-overlay"],
            "vueda-overlay": ["shadow", "vueda-edge", "vueda-focus-shadow"],
            "vueda-focus-shadow": [
                "shadow",
                "vueda-overlay",
                "vueda-focus-outline",
                "outline-style",
                "outline-w",
                "outline-color",
            ],
            "vueda-focus-outline": [
                "vueda-focus-shadow",
                "outline-style",
                "outline-w",
                "outline-color",
                "outline-offset",
            ],
        },
    },
});
