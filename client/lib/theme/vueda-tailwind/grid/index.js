/**
 * @module theme/vueda-tailwind/grid
 * @description Tailwind CSS theme configuration for VUEDA Client grid components.
 */

export default {
    Table: {
        container: {
            class: "relative w-full overflow-auto rounded-vueda-card border border-border bg-card data-[sticky]:overflow-y-auto data-[sticky]:max-h-[var(--vueda-tbl-max-h,30rem)]",
        },
        table: {
            class: "w-full caption-bottom text-body border-separate border-spacing-0 [font-variant-numeric:tabular-nums_slashed-zero]",
        },
    },
    TableBody: {
        root: {
            class: "[&_tr:last-child]:border-0",
        },
    },
    TableCaption: {
        root: {
            class: "text-muted-foreground mt-4 text-body",
        },
    },
    TableCell: {
        root: {
            class: [
                "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
                "[[data-density=default]_&]:h-8 [[data-density=default]_&]:py-1.5",
                "[[data-density=compact]_&]:h-7 [[data-density=compact]_&]:py-1",
                "[[data-density=condensed]_&]:h-6 [[data-density=condensed]_&]:py-0.5 [[data-density=condensed]_&]:text-xs",
                "data-[numeric]:text-right data-[numeric]:font-mono",
                "data-[mono]:font-mono",
            ].join(" "),
        },
    },
    TableEmpty: {
        root: {
            class: "p-4 whitespace-nowrap align-middle text-body text-foreground",
        },
        content: {
            class: [
                "flex flex-col items-center justify-center gap-2.5 py-10 text-center text-muted-foreground",
                "[&>[data-slot=icon]]:text-xl [&>[data-slot=icon]]:text-muted-foreground/70",
                "data-[variant=loading]:[&>[data-slot=icon]]:animate-spin",
                "data-[variant=error]:[&>[data-slot=icon]]:text-destructive/80",
            ].join(" "),
        },
    },
    TableFooter: {
        root: {
            class: "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        },
    },
    TableHead: {
        root: {
            class: [
                "text-foreground h-10 px-2 text-left align-middle font-semibold text-[length:var(--vueda-text-supporting)] whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
                "[[data-density=compact]_&]:h-8",
                "[[data-density=condensed]_&]:h-7 [[data-density=condensed]_&]:text-[11px]",
                "data-[numeric]:text-right data-[numeric]:[&_[data-slot=sort-icon]]:order-first",
                "[[data-sticky]_&]:sticky [[data-sticky]_&]:top-0 [[data-sticky]_&]:z-2 [[data-sticky]_&]:bg-card [[data-sticky]_&]:[box-shadow:0_1px_0_0_var(--border)]",
            ].join(" "),
        },
    },
    TableHeader: {
        root: {
            class: "[&_tr]:border-b",
        },
    },
    TableRow: {
        root: {
            class: "hover:bg-muted/50 data-[state=selected]:bg-primary/[0.06] data-[state=selected]:hover:bg-primary/[0.09] data-[state=selected]:[box-shadow:inset_2px_0_0_0_var(--primary)] border-b transition-colors",
        },
    },
    TableRowActions: {
        root: {
            class: "inline-flex gap-0.5 invisible [tr:hover_&]:visible [tr:focus-within_&]:visible [tr[data-state=selected]_&]:visible",
        },
        action: {
            class: "inline-flex items-center justify-center size-6 rounded-vueda-control border border-transparent text-muted-foreground text-[11px] hover:bg-muted hover:text-foreground hover:border-border focus-visible:outline-none focus-visible:hairline-ring focus-visible:focus-ring-shadow",
        },
    },
};
