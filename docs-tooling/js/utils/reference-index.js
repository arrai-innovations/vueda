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
    const pyParam = pythonParameterParts(memberId);
    if (pyParam) {
        return `${pyParam.functionName}.${pyParam.parameterName}`;
    }
    const vueMember = vueMemberParts(memberId);
    if (vueMember) {
        return vueMember.binding ? `${vueMember.name}.${vueMember.binding}` : vueMember.name;
    }
    const jsParameterPath = javascriptParameterPath(memberId);
    if (jsParameterPath) {
        return jsParameterPath;
    }
    const qualName = memberId.replace(/^[^:]+:[^:]+:/, "");
    const hashName = qualName.includes("#") ? qualName.split("#").pop() : qualName;
    if (hashName.includes(".")) {
        return hashName.split(".").pop();
    }
    return hashName;
};

export const formatApiMemberTitle = (pageTitle, memberName) => (memberName ? `${pageTitle}.${memberName}` : pageTitle);

/**
 * Title for a member id listed on a page titled `pageTitle`.
 *
 * A Vue slot or event can sit on the component's slots or events page, whose title is not the
 * component's name, so a Vue member takes its title from the component in the id.
 */
export const apiMemberTitle = (pageTitle, memberId) => {
    const vueMember = vueMemberParts(memberId);
    return formatApiMemberTitle(vueMember ? vueMember.component : pageTitle, memberNameFromId(memberId));
};

export const themeKeySlotAnchor = (componentName, slotName) => `theme-key-${componentName}-${slotName}`;

export const cssTokenAnchor = (tokenName) => `css-token-${tokenName.replace(/^--/, "")}`;

/**
 * Anchor for a member heading, safe to write as a `{#id}` attribute.
 *
 * markdown-it pairs the underscore runs in `{#__call__}` into emphasis, which
 * emphasises the name and drops the id, so a name with both a leading and a
 * trailing underscore takes hyphens instead. An identifier cannot contain a
 * hyphen, so the substitution cannot collide with another member's name.
 */
export const memberHeadingAnchor = (memberName) => {
    const anchor = slugify(memberName);
    return anchor.startsWith("_") && anchor.endsWith("_") ? anchor.replace(/_/g, "-") : anchor;
};

/**
 * Anchor for a parameter row in a signature table.
 *
 * `ownerAnchor` is the anchor of the member that declares the parameter, or ""
 * when the parameter belongs to the page itself. A dotted `parameterPath` names
 * a key of an object parameter (`params.actionRedirect`). Identifiers cannot
 * contain a hyphen, so the result cannot collide with a member anchor.
 */
export const parameterAnchor = (ownerAnchor, parameterPath) =>
    [ownerAnchor, "param", ...parameterPath.split(".").map(slugify)].filter(Boolean).join("-");

/**
 * Split a `py:param:<function fullname>.<parameter>` id, or return null for any other id.
 */
function pythonParameterParts(memberId) {
    if (!memberId.startsWith("py:param:")) {
        return null;
    }
    const parts = memberId.slice("py:param:".length).split(".");
    return { functionName: parts.at(-2), parameterName: parts.at(-1) };
}

/**
 * Return the parameter path of a `js:param:<module>#<function>:<path>` id, or "" for any other id.
 *
 * A colon separates the path, because a function's qualified name can itself contain dots
 * (`storeTheme.registerComponent`). A dotted path names a key of an object parameter.
 */
function javascriptParameterPath(memberId) {
    if (!memberId.startsWith("js:param:")) {
        return "";
    }
    const qualified = memberId.slice(memberId.indexOf("#") + 1);
    return qualified.slice(qualified.indexOf(":") + 1);
}

const VUE_MEMBER_RE = /^vue:component:([^:]+):(prop|slot|event):(.+)$/;

/**
 * Split a Vue component member id, or return null for any other id.
 *
 * The forms are `vue:component:<Component>:prop:<name>`, `...:event:<name>`, `...:slot:<name>`,
 * and `...:slot:<name>.<binding>` for a slot binding. Slot names contain no dot; event names can
 * contain a colon (`update:modelValue`).
 */
function vueMemberParts(memberId) {
    const match = memberId.match(VUE_MEMBER_RE);
    if (!match) {
        return null;
    }
    const [, component, memberKind, rest] = match;
    if (memberKind !== "slot" || !rest.includes(".")) {
        return { component, memberKind, name: rest, binding: "" };
    }
    const separator = rest.indexOf(".");
    return { component, memberKind, name: rest.slice(0, separator), binding: rest.slice(separator + 1) };
}

/**
 * Anchor for a Vue prop, slot, slot binding, or event. A slot or event carries the same anchor
 * on the component page and on its slots or events page.
 */
export const vueMemberAnchor = (memberKind, name, binding = "") => {
    const anchor = `${memberKind}-${slugify(name)}`;
    return binding ? parameterAnchor(anchor, binding) : anchor;
};

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
    const pyParam = pythonParameterParts(memberId);
    if (pyParam) {
        return parameterAnchor(memberHeadingAnchor(pyParam.functionName), pyParam.parameterName);
    }
    const vueMember = vueMemberParts(memberId);
    if (vueMember) {
        return vueMemberAnchor(vueMember.memberKind, vueMember.name, vueMember.binding);
    }
    const jsParameterPath = javascriptParameterPath(memberId);
    if (jsParameterPath) {
        return parameterAnchor("", jsParameterPath);
    }
    const memberName = memberNameFromId(memberId);
    return memberName ? memberHeadingAnchor(memberName) : "";
};
