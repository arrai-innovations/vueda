/**
 * @module theme/vueda-tailwind/grid
 * @description Tailwind CSS theme configuration for VUEDA Client grid components.
 */

export default {
    Table: {
        container: {
            class: "relative w-full overflow-auto rounded-vueda-card border border-border bg-card",
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
            class: "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        },
    },
    TableEmpty: {
        root: {
            class: "p-4 whitespace-nowrap align-middle text-sm text-foreground",
        },
        content: {
            class: "flex items-center justify-center py-10",
        },
    },
    TableFooter: {
        root: {
            class: "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        },
    },
    TableHead: {
        root: {
            class: "text-foreground h-10 px-2 text-left align-middle font-semibold text-[length:var(--vueda-text-supporting)] whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
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
};
