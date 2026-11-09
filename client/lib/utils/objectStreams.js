/**
 * @module utils/objectStreams
 * @description Optional live updates over the server's object stream websocket. A pushed event says
 *   that a record changed and carries no record data, so the subscribe handler fetches the record again
 *   through the REST API. Views work the same without it: nothing subscribes until
 *   `setupObjectStreams()` runs.
 */
import { setObjectCrud } from "@arrai-innovations/reactive-helpers";
import { storeWorkflow } from "@vueda/stores/storeWorkflow.js";
import { wsOrWssHostname } from "@vueda/utils/connectionHostname.js";
import { defaultObjectRetrieve } from "@vueda/utils/objectCrud.js";
import { getActivePinia } from "pinia";

/** The server's websocket path when `VITE_OBJECT_STREAMS_PATH` is unset. */
export const DEFAULT_OBJECT_STREAMS_PATH = "/ws/streams/";

/** The first reconnect delay, in milliseconds. Each failed attempt doubles it. */
export const RECONNECT_MIN_DELAY = 1000;

/** The longest reconnect delay, in milliseconds. */
export const RECONNECT_MAX_DELAY = 30000;

/**
 * @typedef {object} StreamMessage - A message that the server sends on the socket.
 * @property {string} type - `subscribed`, `unsubscribed`, `event`, `resync_required`, or `error`.
 * @property {string} [subscription_id] - The subscription that the message is for. Errors carry none.
 * @property {string} [facet] - For an event: `object` for a write to the record's own row, `workflow_state` for a transition.
 * @property {string} [op] - For an event: `created`, `updated`, or `deleted`.
 */

/**
 * @typedef {object} ObjectStreamConnection - One websocket shared by every subscription.
 * @property {(message: object, onMessage: (message: StreamMessage) => void) => (() => void)} subscribe -
 *  Sends a subscribe message and returns the function that unsubscribes. Opens the socket when it is closed.
 * @property {() => void} restart - Closes the socket and opens a new one for the current subscriptions.
 * @property {() => void} close - Closes the socket. The subscriptions stay registered.
 */

/**
 * @typedef {object} ObjectStreamConnectionOptions - Where and how the connection opens its socket.
 * @property {string} url - The websocket URL.
 * @property {typeof WebSocket} [WebSocketImpl] - The WebSocket class. Defaults to the browser's.
 * @property {(message: string, detail?: any) => void} [log] - Receives connection problems. Defaults to `console.debug`.
 */

/**
 * Create a connection that opens its socket on the first subscription and closes it after the last.
 *
 * The connection subscribes again after every reconnect, because the server forgets a socket's
 * subscriptions when it closes. It also hands each subscription a `resync_required` message after a
 * reconnect, because changes made while no socket was open never arrive. A lost socket reconnects after a delay that starts at
 * `RECONNECT_MIN_DELAY` and doubles up to `RECONNECT_MAX_DELAY`. A refused handshake, such as one
 * without a signed-in user, also counts as a lost socket.
 *
 * @param {ObjectStreamConnectionOptions} options - The socket URL and test seams.
 * @returns {ObjectStreamConnection} The connection.
 */
export function createObjectStreamConnection({ url, WebSocketImpl = globalThis.WebSocket, log = console.debug }) {
    /** @type {Map<string, { message: object, onMessage: (message: StreamMessage) => void }>} */
    const subscriptions = new Map();
    /** @type {WebSocket|null} */
    let socket = null;
    /** @type {ReturnType<typeof setTimeout>|null} */
    let retryTimer = null;
    let retryDelay = RECONNECT_MIN_DELAY;
    let counter = 0;
    // Whether a socket has opened before. A later open is a reconnect, which may have missed changes.
    let openedBefore = false;

    /** @param {object} message */
    function send(message) {
        if (socket?.readyState === WebSocketImpl.OPEN) {
            socket.send(JSON.stringify(message));
        }
    }

    function open() {
        const opened = new WebSocketImpl(url);
        socket = opened;
        opened.addEventListener("open", () => {
            if (opened !== socket) {
                return;
            }
            retryDelay = RECONNECT_MIN_DELAY;
            const reconnected = openedBefore;
            openedBefore = true;
            for (const [subscriptionId, { message }] of subscriptions) {
                send({ ...message, subscription_id: subscriptionId });
            }
            if (reconnected) {
                // Changes made while no socket was open never arrive, so each view fetches again.
                for (const [subscriptionId, { onMessage }] of [...subscriptions]) {
                    onMessage({ type: "resync_required", subscription_id: subscriptionId });
                }
            }
        });
        opened.addEventListener("message", (event) => {
            if (opened === socket) {
                receive(event.data);
            }
        });
        opened.addEventListener("close", () => {
            if (opened !== socket) {
                return;
            }
            socket = null;
            scheduleReconnect();
        });
    }

    function scheduleReconnect() {
        if (!subscriptions.size || retryTimer) {
            return;
        }
        retryTimer = setTimeout(() => {
            retryTimer = null;
            if (subscriptions.size && !socket) {
                open();
            }
        }, retryDelay);
        retryDelay = Math.min(retryDelay * 2, RECONNECT_MAX_DELAY);
    }

    /** @param {string} data */
    function receive(data) {
        /** @type {StreamMessage} */
        let message;
        try {
            message = JSON.parse(data);
        } catch {
            log("Object stream message is not JSON.", data);
            return;
        }
        if (message?.type === "error") {
            // The server's error messages name no subscription, so no view can act on them.
            log("Object stream error.", message);
            return;
        }
        subscriptions.get(message?.subscription_id)?.onMessage(message);
    }

    function close() {
        if (retryTimer) {
            clearTimeout(retryTimer);
            retryTimer = null;
        }
        const closing = socket;
        socket = null;
        closing?.close();
    }

    return {
        subscribe(message, onMessage) {
            counter += 1;
            const subscriptionId = `s${counter}`;
            subscriptions.set(subscriptionId, { message, onMessage });
            if (socket) {
                send({ ...message, subscription_id: subscriptionId });
            } else if (!retryTimer) {
                open();
            }
            return () => {
                if (!subscriptions.delete(subscriptionId)) {
                    return;
                }
                send({ op: "unsubscribe", subscription_id: subscriptionId });
                if (!subscriptions.size) {
                    close();
                }
            };
        },
        restart() {
            close();
            retryDelay = RECONNECT_MIN_DELAY;
            if (subscriptions.size) {
                open();
            }
        },
        close,
    };
}

/** @type {ObjectStreamConnection|null} */
let connection = null;

/**
 * @param {{ app: string, model: string }} target
 * @param {string|number} pk
 */
function forgetWorkflowHistory(target, pk) {
    const pinia = getActivePinia();
    if (pinia && storeWorkflow.$id in pinia.state.value) {
        // Only a store that the application already uses can hold a cached history.
        storeWorkflow(pinia).forgetObjectHistory(target.app, target.model, pk);
    }
}

/**
 * Call `onChange` whenever the server reports a change to one record.
 *
 * The callback receives each `event` message and each `resync_required` message, which means that
 * events may have been missed. It does not fetch the record. A workflow state change, or a resync,
 * also drops the record's cached workflow state history from `storeWorkflow`, because a transition
 * that someone else ran made it stale. Before `setupObjectStreams()`, nothing subscribes and the
 * callback never runs.
 *
 * @param {object} args - The record to watch.
 * @param {{ app: string, model: string }} args.target - The app label and model name, as in the REST route.
 * @param {string|number} args.pk - The primary key of the record.
 * @param {(message: StreamMessage) => void} onChange - Receives each change message.
 * @returns {() => void} The function that stops watching.
 */
export function watchObjectChanges({ target, pk }, onChange) {
    if (!connection) {
        return () => {};
    }
    return connection.subscribe(
        { op: "subscribe", kind: "object", model: `${target.app}.${target.model}`, pk: String(pk) },
        (message) => {
            if (message.type !== "event" && message.type !== "resync_required") {
                return;
            }
            if (message.type === "resync_required" || message.facet === "workflow_state") {
                forgetWorkflowHistory(target, pk);
            }
            onChange(message);
        },
    );
}

/**
 * The object `subscribe` handler that `setupObjectStreams()` installs.
 *
 * It subscribes to one record and fetches the record again through the REST API after each event,
 * with the same target, primary key, and params as the view's own retrieve. A delete event reports
 * the record as deleted.
 *
 * The returned promise resolves at once and never rejects. reactive-helpers counts a subscription as
 * loading until the promise settles, so waiting for the socket would hold the view in its loading
 * state. The subscription stays registered until its `cancel` method runs, and a socket that fails
 * leaves the view as it was.
 *
 * @param {object} args - The subscribe arguments from reactive-helpers.
 * @param {{ app: string, model: string }} args.target - The app label and model name, as in the REST route.
 * @param {string} args.pk - The primary key of the record.
 * @param {object} args.params - The retrieve params, passed through to the refetch.
 * @param {(data: object, action: "update"|"delete") => void} args.callback - Receives the refetched record.
 * @param {Readonly<import('vue').Ref<boolean>>} [args.isCancelled] - True once the subscription is cancelled.
 * @returns {Promise<void> & { cancel: () => Promise<void> }} A resolved promise that carries the cancel method.
 */
export function objectStreamSubscribe({ target, pk, params, callback, isCancelled }) {
    // ### This function cannot be async, or the promise loses its cancel method. ###
    /** @type {(Promise<object> & { cancel?: () => any })|null} */
    let inFlight = null;
    const cancelled = () => isCancelled?.value === true;

    function cancelInFlight() {
        const request = inFlight;
        inFlight = null;
        // A cancelled fetch rejects, and the handler below ignores a request that is no longer current.
        request?.cancel?.();
    }

    /** @param {StreamMessage} message */
    function onMessage(message) {
        if (cancelled()) {
            return;
        }
        cancelInFlight();
        if (message.type === "event" && message.facet === "object" && message.op === "deleted") {
            callback({}, "delete");
            return;
        }
        const request = defaultObjectRetrieve({ target, pk, params });
        inFlight = request;
        request.then(
            (data) => {
                if (inFlight === request && !cancelled()) {
                    inFlight = null;
                    callback(data, "update");
                }
            },
            () => {
                if (inFlight === request) {
                    inFlight = null;
                }
            },
        );
    }

    const unsubscribe = watchObjectChanges({ target, pk }, onMessage);

    return Object.assign(Promise.resolve(), {
        cancel: async () => {
            unsubscribe();
            cancelInFlight();
        },
    });
}

/**
 * Subscribe to the rows of one list, and call `onChange` after each change to a row it shows or may show.
 *
 * The subscription carries the list's filters, so the server reports a row that joins, leaves, or
 * changes within them. With no filters, it covers every row of the model that the user can read.
 * The callback receives no rows: the caller fetches the list again, because only the server can place
 * a row by the list's ordering and page. A list's search term is not a filter here, so a searched
 * list hears about every row that its other filters match.
 *
 * The returned promise resolves at once and never rejects, for the same reason as
 * `objectStreamSubscribe`.
 *
 * @param {object} args - The list to watch.
 * @param {{ app: string, model: string }} args.target - The app label and model name, as in the REST route.
 * @param {{ [key: string]: string|string[] }} args.filters - The list's filters, encoded by `subscriptionFilters`.
 * @param {() => void} args.onChange - Called after each change message.
 * @returns {Promise<void> & { cancel: () => Promise<void> }} A resolved promise that carries the cancel method.
 */
export function subscribeToListChanges({ target, filters, onChange }) {
    const hasFilters = Object.keys(filters).length > 0;
    const unsubscribe = connection
        ? connection.subscribe(
              {
                  op: "subscribe",
                  kind: hasFilters ? "filter" : "model",
                  model: `${target.app}.${target.model}`,
                  ...(hasFilters ? { filter: filters } : {}),
              },
              (message) => {
                  if (message.type === "event" || message.type === "resync_required") {
                      onChange();
                  }
              },
          )
        : () => {};
    return Object.assign(Promise.resolve(), {
        cancel: async () => {
            unsubscribe();
        },
    });
}

/**
 * Whether `setupObjectStreams()` has run. Views subscribe only when it has.
 *
 * @returns {boolean} True after `setupObjectStreams()`.
 */
export function objectStreamsEnabled() {
    return connection !== null;
}

/**
 * Turn on live updates: install the object `subscribe` handler and create the shared connection.
 *
 * Call it once, after `setupDefaultObjectCrud()`. The server must enable websocket subscriptions,
 * and the socket opens only when a view first subscribes. The URL defaults to the API host with the
 * path from `VITE_OBJECT_STREAMS_PATH`, or `/ws/streams/` when that variable is unset.
 *
 * @param {Partial<ObjectStreamConnectionOptions>} [options] - Overrides for the socket URL and test seams.
 * @returns {ObjectStreamConnection} The shared connection.
 */
export function setupObjectStreams(options = {}) {
    connection?.close();
    const path = import.meta.env.VITE_OBJECT_STREAMS_PATH || DEFAULT_OBJECT_STREAMS_PATH;
    connection = createObjectStreamConnection({ url: `${wsOrWssHostname}${path}`, ...options });
    setObjectCrud({ subscribe: objectStreamSubscribe });
    return connection;
}

/**
 * Open a new socket, so the server reads the current session cookie.
 *
 * The server signs a socket in once, when it opens. Call this after the signed-in user changes.
 * It does nothing before `setupObjectStreams()`.
 *
 * @returns {void}
 */
export function restartObjectStreams() {
    connection?.restart();
}

/**
 * Close the socket and forget the connection, so views stop subscribing. For tests.
 *
 * @returns {void}
 */
export function teardownObjectStreams() {
    connection?.close();
    connection = null;
}
