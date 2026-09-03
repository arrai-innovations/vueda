/**
 * @module theme/vueda-tailwind/views/ViewHistoryList.theme
 *
 * Per-component theme registration for ViewHistoryList. Imported as a side effect by
 * its consuming SFC, so a route chunk that pulls only that SFC drags only this
 * component's theme entry, not the entire views family.
 */
import { patchTheme } from "@vueda/use/themeRegistry.js";

patchTheme({
    /**
     * ViewHistoryList styles the revision history view, including grouped rows,
     * diff cells, history metadata, and empty states.
     */
    ViewHistoryList: {
        /** Outer wrapper. Empty by default; the meta strip, embedded grid, and empty-state card own all visible chrome so the wrapper stays a layout-only anchor. */
        root: {
            class: [],
        },
        /** Row passthrough forwarded to the embedded {@api theme-key:ObjectsGrid.bodyRow}. Paints a 2 px primary left-stripe on the first cell of every row that belongs to a revision (both `data-rev-start` and `data-rev-child`), so a multi-row revision reads as a single grouped band. The card surrounding the grid carries the outer border, so this binding does not redeclare the row's own border. */
        row: {
            class: [
                "data-[rev-start=true]:[&>*:first-child]:border-l-2",
                "data-[rev-start=true]:[&>*:first-child]:border-primary",
                "data-[rev-child=true]:[&>*:first-child]:border-l-2",
                "data-[rev-child=true]:[&>*:first-child]:border-primary",
            ],
        },
        /** Diff chip rendered in each old / new field-value cell. `data-side` selects the tonal recipe (`old` = destructive 7 %-mix with a leading minus glyph; `new` = success 8 %-mix with a leading plus glyph), and `data-empty` overrides both into a transparent italic muted-foreground row with a middle-dot glyph for "nothing on this side". Mono keeps whitespace and unicode artifacts in the diffed value readable. */
        diff: {
            class: [
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-vueda-control",
                "font-mono text-[12px] leading-[1.4]",
                "before:font-semibold before:text-[11px]",
                "data-[side=old]:bg-[color-mix(in_oklab,var(--destructive)_7%,transparent)]",
                "data-[side=old]:text-foreground",
                "data-[side=old]:before:content-['−'] data-[side=old]:before:text-destructive",
                "data-[side=new]:bg-[color-mix(in_oklab,var(--success)_8%,transparent)]",
                "data-[side=new]:text-foreground",
                "data-[side=new]:before:content-['+'] data-[side=new]:before:text-success",
                "data-[empty=true]:italic data-[empty=true]:text-muted-foreground",
                "data-[empty=true]:bg-transparent",
                "data-[empty=true]:before:content-['·'] data-[empty=true]:before:text-muted-foreground",
                "data-[missing=true]:italic data-[missing=true]:text-muted-foreground",
            ],
        },
        /** Field name shown inside a diff chip in the card layout, where the chips of one event stack in a single cell and the table's Field column is absent. Muted and non-mono so the value beside it stays the primary token. */
        diffField: {
            class: ["font-sans font-medium text-muted-foreground after:content-[':']"],
        },
        /** Empty-state card shown when the model has no recorded history. Card-toned with a soft border and 48 px vertical padding so the panel reads as a deliberate state, not an error; the icon / title / description trio inside provides the recovery messaging. */
        empty: {
            class: [
                "flex flex-col items-center justify-center gap-2",
                "py-12 px-6 text-center",
                "rounded-vueda-card hairline hairline-border bg-card",
            ],
        },
        /** 40 px circular icon tile leading the empty state (typically a clock or history glyph). Muted-50 fill on muted-foreground keeps the tile from competing with the title beneath it. */
        emptyIcon: {
            class: [
                "flex items-center justify-center",
                "w-10 h-10 rounded-full bg-muted/50 text-muted-foreground",
                "text-[16px] leading-none",
            ],
        },
        /** Empty-state title ("No history yet" or similar). 14 px / 600 / foreground; same recipe as banner titles on {@api theme-key:ModelActionForm.bannerTitle} so empty states read consistently across surfaces. */
        emptyTitle: {
            class: ["text-[14px] font-semibold leading-[1.3] text-foreground"],
        },
        /** Empty-state description beneath the title. 12 px / muted-foreground capped at 44ch so the explanation reads as a paragraph, not a heading. */
        emptyDesc: {
            class: ["text-[12px] font-normal leading-[1.5] text-muted-foreground max-w-[44ch]"],
        },
        /** Absolute timestamp on the upper line of the two-line history-date cell. 12 px / foreground so the absolute value reads as the primary token; the relative phrase on {@api theme-key:ViewHistoryList.cellDateRel} sits beneath it. */
        cellDate: {
            class: ["text-[12px] leading-[1.3] text-foreground"],
        },
        /** Relative phrase ("3 days ago") beneath the absolute timestamp. 11 px / muted-foreground per the headline / supporting-copy hierarchy. */
        cellDateRel: {
            class: ["text-[11px] leading-[1.3] text-muted-foreground"],
        },
        /** Inline wrapper around the 22 px {@api theme-key:UserAvatar} chip and the actor name beside it. `inline-flex` keeps the chip / name pair on a single baseline so the row aligns vertically with the other history columns. */
        cellUser: {
            class: ["inline-flex items-center gap-2"],
        },
        /** Actor-name fragment next to the avatar chip. Uses the supporting type token at 500 / foreground so the name reads as the primary value in the cell. */
        cellUserName: {
            class: [
                "text-[length:var(--vueda-text-supporting)] font-medium leading-tight text-foreground",
                "data-[missing=true]:italic data-[missing=true]:font-normal data-[missing=true]:text-muted-foreground",
            ],
        },
        /** Action-kind pill ("request", "task", "command", "system") in the Kind column. The vocabulary is open, so the base recipe is a neutral muted tag and `data-kind` adds a tone only for the values VUEDA defines; an unrecognized kind still renders as itself in the neutral recipe. */
        kindPill: {
            class: [
                "inline-flex items-center rounded-full hairline px-2 py-0.5",
                "text-[10.5px] font-semibold uppercase tracking-wide leading-none",
                "bg-muted/40 text-muted-foreground",

                // Data attribute states.
                "data-[kind=request]:text-foreground",
                "data-[kind=task]:[--vueda-hairline-color:color-mix(in_oklab,var(--info)_25%,transparent)]",
                "data-[kind=task]:bg-[color-mix(in_oklab,var(--info)_8%,transparent)]",
                "data-[kind=task]:text-info",
                "data-[kind=command]:[--vueda-hairline-color:color-mix(in_oklab,var(--warning)_30%,transparent)]",
                "data-[kind=command]:bg-[color-mix(in_oklab,var(--warning)_10%,transparent)]",
                "data-[kind=command]:text-warning",
            ],
        },
        /** Model cell naming the row an event wrote. `data-relation="self"` is the requested object and renders as plain foreground text; `data-relation="related"` is another row that references it and renders muted, with the object id beside it on {@api theme-key:ViewHistoryList.cellModelObject}. */
        cellModel: {
            class: [
                "inline-flex items-baseline gap-1 text-[12px] leading-[1.3] text-foreground",
                "data-[relation=related]:text-muted-foreground",
            ],
        },
        /** Object id fragment after a related row's model name. Mono at 11 px so `#1204` reads as an identifier rather than prose. */
        cellModelObject: {
            class: ["font-mono text-[11px] text-muted-foreground"],
        },
        /** History-type pill ("Created", "Updated", "Deleted", "Restored") rendered in the history-type column. `data-kind` selects the tonal recipe (created = success, updated = info, deleted = destructive, restored = warning); unknown values fall back to the raw display value via the slot fallback in the consumer, not this recipe. Small uppercase label with a 12 px leading icon so the pill reads as a category tag, not a button. */
        typePill: {
            class: [
                "inline-flex items-center gap-1 rounded-full hairline px-2 py-0.5",
                "text-[10.5px] font-semibold uppercase tracking-wide leading-none",
                "[&>svg]:size-3",

                // Data attribute states.
                "data-[kind=created]:[--vueda-hairline-color:color-mix(in_oklab,var(--success)_30%,transparent)]",
                "data-[kind=created]:bg-[color-mix(in_oklab,var(--success)_10%,transparent)]",
                "data-[kind=created]:text-success",
                "data-[kind=updated]:[--vueda-hairline-color:color-mix(in_oklab,var(--info)_25%,transparent)]",
                "data-[kind=updated]:bg-[color-mix(in_oklab,var(--info)_8%,transparent)]",
                "data-[kind=updated]:text-info",
                "data-[kind=deleted]:[--vueda-hairline-color:color-mix(in_oklab,var(--destructive)_25%,transparent)]",
                "data-[kind=deleted]:bg-[color-mix(in_oklab,var(--destructive)_8%,transparent)]",
                "data-[kind=deleted]:text-destructive",
                "data-[kind=restored]:[--vueda-hairline-color:color-mix(in_oklab,var(--warning)_30%,transparent)]",
                "data-[kind=restored]:bg-[color-mix(in_oklab,var(--warning)_10%,transparent)]",
                "data-[kind=restored]:text-warning",
            ],
        },
        /** Meta strip above the grid: filter slot on the left, layout toggle on the right. Muted-10 wash and a bottom hairline so the strip reads as supporting chrome rather than its own band; kept light because the history view surfaces only a filter slot and a layout toggle, not a full control strip. */
        meta: {
            class: ["flex items-center gap-3 flex-wrap", "border-b-hairline bg-muted/10", "px-4 py-2 text-sm"],
        },
        /** Inline item inside the meta strip (e.g. an active filter chip). Muted-foreground colour and a 4 px gap between icon and label so the item reads as supporting metadata. */
        metaItem: {
            class: ["inline-flex items-center gap-1 text-muted-foreground"],
        },
        /** Vertical hairline separator between meta items. 12 px tall, `var(--border)` fill; sized to match the meta-row x-height so the divider aligns with the text baseline. */
        metaDivider: {
            class: ["mx-2 h-3 w-hairline bg-border"],
        },
        /** Flexible filler that pushes the layout toggle to the right end of the meta strip. */
        metaSpacer: {
            class: ["ml-auto"],
        },
        /** Outer chassis of the segmented Table / Cards button pair. `overflow-clip` lets the inner buttons render their own internal hairline (`first:border-r`) without poking past the chassis radius. */
        layoutToggle: {
            class: ["flex overflow-clip rounded-vueda-control hairline hairline-border"],
        },
        /** One button inside the layout toggle. Transparent / muted-foreground in the default state and tinted accent at `data-active="true"`; the leading icon is sized at 12 px so it sits with the label baseline. Focus uses the canon `focus-ring` utility so it follows the DPR-keyed system focus recipe alongside the rest of the kit. */
        layoutButton: {
            class: [
                "inline-flex items-center gap-1.5 px-2 py-1 text-xs",
                "text-muted-foreground bg-transparent",
                "first:border-r-hairline",
                "hover:bg-accent hover:text-accent-foreground",
                "active:bg-accent-active active:text-accent-foreground",
                "data-[active=true]:bg-accent data-[active=true]:text-foreground",
                "[&>svg]:size-3",
                "focus-visible:focus-ring",
            ],
        },
        /** Optional extra class applied to the active layout button. Empty by default because {@api theme-key:ViewHistoryList.layoutButton} already routes its active state via `data-[active=true]`; consumers can opt into an additional emphasis here without duplicating the base recipe. */
        layoutButtonActive: {
            class: [],
        },
    },
});
