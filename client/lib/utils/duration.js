/**
 * @module utils/duration
 * @description Parses and serializes Django-style duration strings (D HH:MM:SS) to and from plain objects,
 * and normalizes either serialized shape (that string or a number of seconds) into whole units for display.
 */

const durationRegExp = /^(?:(\d+)\s+)?(\d{2}):(\d{2}):(\d{2})$/;

/**
 * Parses a Django-style duration string (D HH:MM:SS) into a plain object.
 *
 * @param {string} durationString - The duration string to parse.
 * @returns {{days: number, hours: number, minutes: number, seconds: number}|null} The parsed duration, or null if the string is invalid.
 */
export function parseDuration(durationString) {
    const match = durationString.match(durationRegExp);
    if (!match) {
        return null;
    }
    const days = parseInt(match[1] || "0", 10);
    const hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3], 10);
    const seconds = parseInt(match[4], 10);
    return { days, hours, minutes, seconds };
}

/**
 * Serializes a duration plain object back into a Django-style duration string (D HH:MM:SS).
 *
 * @param {{days?: number, hours?: number, minutes?: number, seconds?: number}} durationObject - The duration to serialize.
 * @returns {string} The formatted duration string.
 */
export function convertDurationToString(durationObject) {
    const padWithZero = (num) => String(num).padStart(2, "0");
    const days = padWithZero(durationObject.days || 0);
    const hours = padWithZero(durationObject.hours || 0);
    const minutes = padWithZero(durationObject.minutes || 0);
    const seconds = padWithZero(durationObject.seconds || 0);
    return `${days} ${hours}:${minutes}:${seconds}`;
}

/**
 * Normalizes any serialized duration into a sign plus whole days, hours, minutes, and
 * seconds, so a display component can word it without knowing which serializer sent it.
 *
 * Two shapes arrive from the server. DRF's `DurationField` sends a Django duration string
 * (`[-]D HH:MM:SS[.ffffff]`, days omitted when zero), where a negative duration carries its
 * sign on the day count while the clock part stays positive, so `-1 23:00:00` means minus
 * one hour. VUEDA's `DurationSecondsField` sends a number of seconds instead. Both reduce
 * to a total, which this function then splits back into units.
 *
 * Sub-second precision is dropped: the seconds component truncates toward zero.
 *
 * @param {string|number|null|undefined} value - A Django duration string, a number of seconds, or an empty value.
 * @returns {{negative: boolean, days: number, hours: number, minutes: number, seconds: number, totalSeconds: number}|null} The normalized parts, or null when the value is empty or unparseable.
 */
export function normalizeDuration(value) {
    let totalSeconds;
    if (typeof value === "number") {
        totalSeconds = Number.isFinite(value) ? value : null;
    } else if (typeof value === "string" && value.trim() !== "") {
        const match = value.trim().match(/^(?:(-?\d+)\s+)?(\d+):([0-5]\d):([0-5]\d)(?:\.(\d+))?$/);
        if (!match) {
            // A bare number of seconds also arrives as a string from a query parameter.
            const asNumber = Number(value);
            totalSeconds = Number.isFinite(asNumber) ? asNumber : null;
        } else {
            const days = parseInt(match[1] || "0", 10);
            totalSeconds =
                days * 86400 +
                parseInt(match[2], 10) * 3600 +
                parseInt(match[3], 10) * 60 +
                parseInt(match[4], 10) +
                Number(`0.${match[5] || "0"}`);
        }
    } else {
        totalSeconds = null;
    }
    if (totalSeconds === null) {
        return null;
    }
    const whole = Math.trunc(Math.abs(totalSeconds));
    return {
        negative: totalSeconds < 0,
        days: Math.floor(whole / 86400),
        hours: Math.floor((whole % 86400) / 3600),
        minutes: Math.floor((whole % 3600) / 60),
        seconds: whole % 60,
        totalSeconds,
    };
}
