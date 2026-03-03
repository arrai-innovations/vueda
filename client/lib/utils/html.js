/**
 * @module utils/html
 * @description Utilities for escaping, sanitizing, and detecting HTML in user-supplied strings.
 */
import DOMPurify from "dompurify";
import isObject from "lodash-es/isObject.js";
import isString from "lodash-es/isString.js";

/**
 * Escape HTML characters in a message.
 *
 * @param {string} message - The message to escape.
 * @returns {string} - The escaped message.
 */
export const escapeHtml = (message) => {
    const map = {
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&#039;": "'",
        "&nbsp;": " ",
    };
    return message?.replace(/&amp;|&lt;|&gt;|&quot;|&#039;|&nbsp;/g, (m) => map[m]);
};

/**
 * Sanitize a message to prevent XSS attacks.
 *
 * @param {string} message - The message to sanitize.
 * @returns {string} - The sanitized message.
 */
export const sanitizeMessage = (message) => {
    const escapedMessage = escapeHtml(message);

    return DOMPurify.sanitize(escapedMessage, {
        ALLOWED_TAGS: ["b", "strong", "i", "em", "p", "a", "ul", "ol", "li"],
        ALLOWED_ATTR: ["href", "target", "rel"],
    });
};

/**
 * Sanitize messages to prevent XSS attacks.
 *
 * @param {{ [code: string]: string | string[] | object }} messages - The messages to sanitize.
 */
export const sanitizeMessages = (messages) => {
    if (isString(messages)) {
        return sanitizeMessage(messages);
    }
    return Object.fromEntries(
        Object.entries(messages).map(([key, value]) => {
            let sanitizedMessage;
            if (Array.isArray(value)) {
                sanitizedMessage = value.map((message) => sanitizeMessages(message));
            } else if (isObject(value)) {
                const sanitizedValue = {};
                for (const [k, v] of Object.entries(value)) {
                    sanitizedValue[sanitizeMessage(k)] = sanitizeMessages(v);
                }
                sanitizedMessage = sanitizedValue;
            } else {
                sanitizedMessage = sanitizeMessage(value);
            }
            return [key, sanitizedMessage];
        }),
    );
};

export const tagRegex = /<\/?[a-z][\s\S]*>/i;
export const containsHtml = (message) => tagRegex.test(message);
