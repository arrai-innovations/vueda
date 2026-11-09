/**
 * @module utils/objectStreams
 * @description Optional live updates over the server's object stream websocket. A pushed event says
 *   that a record changed and carries no record data, so the subscribe handler fetches the record again
 *   through the REST API. Views work the same without it: nothing subscribes until
 *   `setupObjectStreams()` runs.
 */
import { setObjectCrud } from "@arrai-innovations/reactive-helpers";
import { wsOrWssHostname } from "@vueda/utils/connectionHostname.js";
import { defaultObjectRetrieve } from "@vueda/utils/objectCrud.js";

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
 * subscriptions when it closes. A lost socket reconnects after a delay that starts at
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
            for (const [subscriptionId, { message }] of subscriptions) {
                send({ ...message, subscription_id: subscriptionId });
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
        if (cancelled() || (message.type !== "event" && message.type !== "resync_required")) {
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

    const unsubscribe = connection
        ? connection.subscribe(
              { op: "subscribe", kind: "object", model: `${target.app}.${target.model}`, pk: String(pk) },
              onMessage,
          )
        : () => {};

    return Object.assign(Promise.resolve(), {
        cancel: async () => {
            unsubscribe();
            cancelInFlight();
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
