/**
 * @module theme/vueda-tailwind/grid
 * @description Tailwind CSS theme configuration for VUEDA Client grid components.
 */

export default {
    GridTable: {
        container: {
            class: "relative w-full overflow-auto",
        },
        table: {
            class: "w-full caption-bottom text-sm",
        },
    },
    GridTableBody: {
        root: {
            class: "[&_tr:last-child]:border-0",
        },
    },
    GridTableCaption: {
        root: {
            class: "text-muted-foreground mt-4 text-sm",
        },
    },
    GridTableCell: {
        root: {
            class: "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        },
    },
    GridTableEmpty: {
        root: {
            class: "p-4 whitespace-nowrap align-middle text-sm text-foreground",
        },
        content: {
            class: "flex items-center justify-center py-10",
        },
    },
    GridTableFooter: {
        root: {
            class: "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        },
    },
    GridTableHead: {
        root: {
            class: "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        },
    },
    GridTableHeader: {
        root: {
            class: "[&_tr]:border-b",
        },
    },
    GridTableRow: {
        root: {
            class: "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        },
    },
};
