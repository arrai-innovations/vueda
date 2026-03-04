/**
 * @module utils/breakpoints
 * @description Custom Tailwind-based breakpoint definitions for use with VueUse `useBreakpoints`.
 */

/**
 * Breakpoint map aligned with the project's Tailwind screen configuration.
 * Values are minimum viewport widths in pixels.
 *
 * @type {{[breakpointName: string]: number}}
 */
export const breakpointsVueda = {
    "2xs": 480, // custom, see tailwind.config.js#theme[.extend].screens
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    "2xl": 1536,
    "3xl": 1920, // custom, see tailwind.config.js#theme[.extend].screens
    "4xl": 2240, // custom, see tailwind.config.js#theme[.extend].screens
    "5xl": 2560, // custom, see tailwind.config.js#theme[.extend].screens
    inf: 999999, // custom, see tailwind.config.js#theme[.extend].screens
};
