/**
 * @module utils/breakpoints
 * @description Breakpoint definitions for use with VueUse `useBreakpoints`.
 */

/**
 * Breakpoint map used by VUEDA's responsive composables and components.
 * Values are minimum viewport widths in pixels. The standard breakpoints
 * (sm through 2xl) match common CSS framework defaults. Custom entries
 * (2xs, 3xl, 4xl, 5xl, inf) extend the range for wider or narrower viewports.
 *
 * These values should match the CSS breakpoints configured in your project's
 * stylesheet so that JS-driven and CSS-driven responsive behavior stay aligned.
 *
 * @type {{[breakpointName: string]: number}}
 */
export const breakpointsVueda = {
    "2xs": 480,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    "2xl": 1536,
    "3xl": 1920,
    "4xl": 2240,
    "5xl": 2560,
    inf: 999999,
};
