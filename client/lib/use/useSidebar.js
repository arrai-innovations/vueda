/**
 * @module use/useSidebar
 * @description Provides the sidebar context pair for injecting and consuming sidebar state
 * across the NavigationSidebar component tree.
 * Based on the shadcn-vue sidebar implementation.
 */
import { createContext } from "reka-ui";

/**
 * @typedef {object} SidebarContext
 * @property {import('vue').ComputedRef<'expanded'|'collapsed'>} state - Current sidebar state.
 * @property {import('vue').Ref<boolean>} open - Whether the sidebar is open (desktop).
 * @property {(value: boolean) => void} setOpen - Sets the desktop open state and persists to cookie.
 * @property {import('vue').Ref<boolean>} isMobile - Whether the viewport is in mobile range.
 * @property {import('vue').Ref<boolean>} openMobile - Whether the sidebar is open on mobile.
 * @property {(value: boolean) => void} setOpenMobile - Sets the mobile open state.
 * @property {() => void} toggleSidebar - Toggles open state for the current viewport mode.
 */

/**
 * Injects the sidebar context provided by the nearest `NavigationSidebarProvider` ancestor.
 *
 * @returns {SidebarContext}
 */
export const [useSidebar, provideSidebarContext] = createContext("Sidebar");
