/**
 * @module utils/connectionHostname
 * @description Derives the backend connection hostname from the current window location,
 *   optionally overriding the port via the `VITE_DJANGO_CONNECTION_PORT` environment variable.
 */

// These constants are evaluated at module load. During server-side rendering or
// static prerendering (for example the VitePress docs build), `window` is undefined,
// so the reads are guarded with SSR fallbacks. The fallback values are never used to
// reach a real backend; they only keep the module importable outside the browser.
const SSR_HOSTNAME = "localhost";
const SSR_PROTOCOL = "http:";

function getHostname() {
    if (typeof window === "undefined") return SSR_HOSTNAME;
    const port = import.meta.env.VITE_DJANGO_CONNECTION_PORT;
    return (port && window.location.hostname + ":" + port) || window.location.hostname;
}

function getProtocol() {
    return typeof window === "undefined" ? SSR_PROTOCOL : window.location.protocol;
}

/** @type {string} Hostname (and optional port) for the backend connection. */
export const connectionHostname = getHostname();

/** @type {string} Full HTTP/HTTPS origin URL for the backend. */
export const httpOrHttpsHostname = `${getProtocol()}//${connectionHostname}`;

/** @type {string} Full WS/WSS origin URL for the backend WebSocket connection. */
export const wsOrWssHostname = `ws${getProtocol() === "https:" ? "s" : ""}://${connectionHostname}`;
