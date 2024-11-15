import DOMPurify from "dompurify";

/**
 * Sanitize a message to prevent XSS attacks.
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
 * @param {{ [code: string]: string }} messages - The messages to sanitize.
 */
export const sanitizeMessages = (messages) => {
    return Object.fromEntries(
        Object.entries(messages).map(([key, value]) => {
            return [key, sanitizeMessage(value)];
        }),
    );
};

export const tagRegex = /<\/?[a-z][\s\S]*>/i;
export const containsHtml = (message) => tagRegex.test(message);
