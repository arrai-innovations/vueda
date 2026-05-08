/**
 * @module theme/vueda-tailwind/grid
 * @description Tailwind CSS theme configuration for VUEDA Client grid components.
 */

export default {
    Table: {
        container: {
            class: "relative w-full overflow-auto",
        },
        table: {
            class: "w-full caption-bottom text-body",
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
            class: "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        },
    },
    TableHeader: {
        root: {
            class: "[&_tr]:border-b",
        },
    },
    TableRow: {
        root: {
            class: "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        },
    },
};
