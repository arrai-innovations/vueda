/**
 * Helpers for building labels in the VitePress API reference index.
 */

export const memberNameFromId = (memberId) => {
    const restResponseMatch = memberId.match(/^rest:endpoint:.*:response:([^:]+)$/);
    if (restResponseMatch) {
        return restResponseMatch[1];
    }
    if (memberId.startsWith("theme-key:") && !memberId.includes(".")) {
        return "";
    }
    const qualName = memberId.replace(/^[^:]+:[^:]+:/, "");
    const hashName = qualName.includes("#") ? qualName.split("#").pop() : qualName;
    if (hashName.includes(".")) {
        return hashName.split(".").pop();
    }
    return hashName;
};

export const formatApiMemberTitle = (pageTitle, memberName) => (memberName ? `${pageTitle}.${memberName}` : pageTitle);
