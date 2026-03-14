/**
 * @module utils/connectionHostname
 * @description Derives the backend connection hostname from the current window location,
 *   optionally overriding the port via the `VITE_DJANGO_CONNECTION_PORT` environment variable.
 */

function getHostname() {
    const port = import.meta.env.VITE_DJANGO_CONNECTION_PORT;
    return (port && window.location.hostname + ":" + port) || window.location.hostname;
}

/** @type {string} Hostname (and optional port) for the backend connection. */
export const connectionHostname = getHostname();

/** @type {string} Full HTTP/HTTPS origin URL for the backend. */
export const httpOrHttpsHostname = `${window.location.protocol}//${connectionHostname}`;

/** @type {string} Full WS/WSS origin URL for the backend WebSocket connection. */
export const wsOrWssHostname = `ws${window.location.protocol === "https:" ? "s" : ""}://${connectionHostname}`;
