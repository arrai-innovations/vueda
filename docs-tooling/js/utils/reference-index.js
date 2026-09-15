/**
 * Helpers for building labels and anchors in the VitePress API reference index.
 *
 * The anchor helpers are shared with the renderers that write the anchors, so
 * the markup a page carries and the target a reference points at cannot drift
 * apart.
 */
import { slugify } from "./slugify.js";

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

export const themeKeySlotAnchor = (componentName, slotName) => `theme-key-${componentName}-${slotName}`;

export const cssTokenAnchor = (tokenName) => `css-token-${tokenName.replace(/^--/, "")}`;

/**
 * Anchor for a member id, or "" when the id names its own page.
 *
 * The theming renderers write an explicit `<a id>` per member and the rest give
 * each member heading an explicit `{#slug}`. Neither matches the slug VitePress
 * derives from heading text, which is lowercased, so a camelCase member needs
 * the renderer's own form.
 */
export const memberAnchorFromId = (memberId) => {
    if (memberId.startsWith("css-token:")) {
        return cssTokenAnchor(memberId.slice("css-token:".length));
    }
    if (memberId.startsWith("theme-key:")) {
        const qualified = memberId.slice("theme-key:".length);
        const separator = qualified.indexOf(".");
        if (separator === -1) {
            return "";
        }
        return themeKeySlotAnchor(qualified.slice(0, separator), qualified.slice(separator + 1));
    }
    const memberName = memberNameFromId(memberId);
    return memberName ? slugify(memberName) : "";
};
