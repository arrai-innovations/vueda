/**
 * @module theme/vueda-tailwind/views/ViewRead.theme
 *
 * Per-component theme registration for ViewRead. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 */
import { patchTheme } from "@vueda/theme/vueda-tailwind/registry.js";

patchTheme({
    /**
     * ViewRead presents a single model instance in a read-only layout. PageTitle
     * and a StickyBar own the page chrome above the body; these slots style the
     * body region beneath them.
     */
    ViewRead: {
        /** Outer wrapper. Layout-only; PageTitle, the StickyBar, and the body below own the visible chrome, so this stays empty by default. */
        root: {
            class: [],
        },
        /** Body region wrapping the error display and the read-only field layout. `px-5 py-5` sets the content gutter; the horizontal `px-5` aligns the body's left edge with the {@api theme-key:StickyBar} controls and {@api theme-key:PageTitle} title above it so the page chrome reads as a continuous column. Inherited `$attrs` (including a consumer-supplied `class`) merge here. */
        body: {
            class: ["px-5 py-5"],
        },
        /** Heading at the top of the body that names the record by its formatted name, above the read-only fields. It scrolls with the body rather than sticking with the page title, so a long name wraps instead of growing the sticky header. */
        recordName: {
            class: ["mb-4 text-lg font-semibold leading-tight break-words"],
        },
        /** Placeholder shown in place of {@api theme-key:ViewRead.recordName} while the record is loading. Sized to one line of the heading. */
        recordNameSkeleton: {
            class: ["mb-4 h-[22px] w-64 max-w-full"],
        },
    },
});
