const durationRegExp = /^(?:(\d+)\s+)?(\d{2}):(\d{2}):(\d{2})$/;

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

export function convertDurationToString(durationObject) {
    const padWithZero = (num) => String(num).padStart(2, "0");
    const days = padWithZero(durationObject.days || 0);
    const hours = padWithZero(durationObject.hours || 0);
    const minutes = padWithZero(durationObject.minutes || 0);
    const seconds = padWithZero(durationObject.seconds || 0);
    return `${days} ${hours}:${minutes}:${seconds}`;
}
