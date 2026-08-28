/**
 * @module utils/html
 * @description Utilities for sanitizing and detecting HTML in user-supplied strings.
 */
import DOMPurify from "dompurify";
import isObject from "lodash-es/isObject.js";
import isString from "lodash-es/isString.js";

/**
 * Sanitize a message to prevent XSS attacks.
 *
 * Markup a server sends deliberately is supported through a restrictive allowlist: basic emphasis,
 * paragraphs, lists, and links. Everything else is removed. Text that arrives entity-encoded stays
 * encoded and therefore displays as the literal characters it stands for.
 *
 * @param {string} message - The message to sanitize.
 * @returns {string} - The sanitized message.
 */
export const sanitizeMessage = (message) => {
    return DOMPurify.sanitize(message, {
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
/**
 * Tests whether a string contains any HTML tags.
 *
 * @param {string} message - The string to test.
 * @returns {boolean} True if the string contains HTML tags.
 */
export const containsHtml = (message) => tagRegex.test(message);
