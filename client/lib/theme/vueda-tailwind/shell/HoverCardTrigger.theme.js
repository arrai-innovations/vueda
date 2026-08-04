/**
 * @module theme/vueda-tailwind/shell/HoverCardTrigger.theme
 *
 * Per-component theme registration for HoverCardTrigger. Imported as a side effect by
 * HoverCardTrigger.vue, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire shell family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * HoverCardTrigger provides the theme hook for the element that opens hover card content.
     */
    HoverCardTrigger: {
        /**
         * The trigger hook for hover-card content. It ships empty so the trigger can inherit the semantics and visual treatment of the element that owns the hover affordance.
         */
        root: { class: "" },
    },
});
