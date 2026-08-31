/**
 * @module use/useConfirmationController
 * @description Factory for the reactive controller behind submit-time warning confirmation dialogs
 * (server confirm-then-save, HTTP 409). Shared by `useObjectForm` and `useActionForm`.
 */
import { reactive } from "vue";

/**
 * Reactive controller for the submit-time warning confirmation dialog. Bind a dialog component to
 * `open`/`messages` and wire its actions to `confirm()`/`cancel()`. `request()` is called by the
 * confirmation hook and resolves once the user responds.
 *
 * Consumers announce themselves via `register()`/`unregister()` (`FormConfirmDialog` does this on
 * mount/unmount; a custom dialog must do the same). When `request()` is called with no registered
 * consumer it fails closed: it warns on the console and resolves `false` (cancel) instead of
 * waiting on a dialog that will never render, which would leave the submit pending forever.
 *
 * @typedef {{ [field: string]: string[] }} FieldWarnings - Warnings keyed by field
 *  (`non_field_errors` for messages not tied to a field).
 * @typedef {FieldWarnings | { [objectId: string]: FieldWarnings }} WarningsMapping - Either the
 *  flat `FieldWarnings` shape, or keyed by object id with each value a
 *  `FieldWarnings` mapping for that object.
 *
 * @typedef {object} ConfirmationController
 * @property {boolean} open - Whether the confirmation dialog should be shown.
 * @property {WarningsMapping} messages - Warnings to display.
 * @property {boolean} bulk - Whether `messages` uses the per-object shape (`true`) or the aggregate
 *  shape (`false`). Set from the `bulk` option passed to `request()`, which in turn comes from the
 *  `ConfirmationRequiredError` that reported the warnings -- the only place that knows which
 *  request path (single-object or bulk) produced them.
 * @property {number} consumers - Number of registered consumers able to resolve a request.
 * @property {() => void} register - Announce a consumer that renders the dialog and will call `confirm()`/`cancel()`.
 * @property {() => void} unregister - Remove a previously registered consumer.
 * @property {(messages: WarningsMapping, options?: { bulk?: boolean }) => Promise<boolean>} request - Open the
 *  dialog and resolve to the user's choice (true = confirm, false = cancel). Resolves `false` immediately when
 *  no consumer is registered.
 * @property {() => void} confirm - Resolve the pending request with `true`.
 * @property {() => void} cancel - Resolve the pending request with `false`.
 */

const DEFAULT_NO_CONSUMER_WARNING =
    "useConfirmationController: a submission returned warnings that require confirmation, but no " +
    "dialog is bound to the confirmation controller; treating it as cancelled. Render " +
    '<FormConfirmDialog :controller="..." /> (or register a custom consumer via ' +
    "confirmation.register()) so the submission can be confirmed.";

/**
 * Creates a {@link ConfirmationController}.
 *
 * @param {object} [options]
 * @param {string} [options.noConsumerWarning] - Message logged via `console.warn` when `request()`
 *  fails closed because no consumer is registered. Callers should point developers at how to mount
 *  a dialog for their composable; a generic message is used when omitted.
 * @returns {ConfirmationController} The confirmation controller.
 */
export function useConfirmationController({ noConsumerWarning } = {}) {
    let confirmationResolve = null;
    /** @type {ConfirmationController} */
    const confirmation = reactive({
        open: false,
        messages: {},
        bulk: false,
        consumers: 0,
        register() {
            confirmation.consumers += 1;
        },
        unregister() {
            confirmation.consumers = Math.max(0, confirmation.consumers - 1);
        },
        request(messages, { bulk = false } = {}) {
            // Record the set even when failing closed below, so the next round's hook can clear it.
            confirmation.messages = messages ?? {};
            confirmation.bulk = bulk;
            if (!confirmation.consumers) {
                // Fail closed: with nothing bound to resolve the request, waiting would leave the
                // submit pending forever (loading stuck on, the duplicate-submit guard returning the
                // same pending promise).
                console.warn(noConsumerWarning ?? DEFAULT_NO_CONSUMER_WARNING);
                return Promise.resolve(false);
            }
            confirmation.open = true;
            return new Promise((resolve) => {
                confirmationResolve = resolve;
            });
        },
        confirm() {
            confirmation.open = false;
            const resolve = confirmationResolve;
            confirmationResolve = null;
            resolve?.(true);
        },
        cancel() {
            confirmation.open = false;
            const resolve = confirmationResolve;
            confirmationResolve = null;
            resolve?.(false);
        },
    });
    return confirmation;
}
