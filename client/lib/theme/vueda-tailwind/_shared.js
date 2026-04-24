/**
 * @module theme/vueda-tailwind/_shared
 * @description Shared Tailwind class constants used across multiple theme entries.
 */

/**
 * Base classes common to all button-styled elements.
 */
export const BUTTON_BASE = [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-vueda-control text-sm font-medium transition-all",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "aria-invalid:border-destructive",
];

/** Button variant: primary (default). */
export const BUTTON_VARIANT_DEFAULT = "bg-primary text-primary-foreground hover:bg-primary/90";

/** Button variant: destructive action. */
export const BUTTON_VARIANT_DESTRUCTIVE =
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:outline-destructive dark:bg-destructive/60";

/** Button variant: outline border. */
export const BUTTON_VARIANT_OUTLINE =
    "border bg-background shadow-vueda-control hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50";

/** Button variant: secondary fill. */
export const BUTTON_VARIANT_SECONDARY = "bg-secondary text-secondary-foreground hover:bg-secondary/80";

/** Button variant: ghost (transparent until hover). */
export const BUTTON_VARIANT_GHOST = "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50";

/** Button variant: text link. */
export const BUTTON_VARIANT_LINK = "text-primary underline-offset-4 hover:underline";
