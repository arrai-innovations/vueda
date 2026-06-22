/**
 * @module shell/popover/keepOpenOverNestedPopper
 * @description Guard for a popover's outside-interaction events so it does not dismiss when the
 * interaction targets a nested floating layer (a combobox or select dropdown) that portals out of
 * the popover's DOM subtree.
 */

/**
 * Reka renders popper-positioned floating content (combobox/select dropdowns, nested popovers)
 * inside its own portal, wrapped in an element carrying this attribute. Because the wrapper lives
 * outside the host popover's DOM, interacting with it reads as an "outside" interaction and would
 * otherwise dismiss the host popover. A genuine outside click (page chrome, backdrop) has no such
 * ancestor, so it still dismisses.
 */
const REKA_POPPER_WRAPPER_SELECTOR = "[data-reka-popper-content-wrapper]";

/**
 * Prevent a popover's `interact-outside` (pointer/focus outside) dismissal when the originating
 * target sits inside a nested Reka floating layer. Wire it as the popover content's
 * `@interact-outside` handler.
 *
 * @param {CustomEvent} event - The Reka `interactOutside` event; `event.detail.originalEvent` holds the DOM event.
 * @returns {void}
 */
export function keepOpenOverNestedPopper(event) {
    const target = event?.detail?.originalEvent?.target;
    if (target instanceof Element && target.closest(REKA_POPPER_WRAPPER_SELECTOR)) {
        event.preventDefault();
    }
}
