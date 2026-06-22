import { buildCanonicalIndex } from "../utils/index-canonical.js";
import { buildPdocPathMap } from "../utils/path-map.js";
import {
    escapeText,
    formatParameters,
    formatSource,
    linkToPath,
    normalizeTitle,
    renderCodeInline,
    renderFrontmatter,
    renderHeading,
    renderLifecycle,
    renderList,
    renderTable,
    slugify,
} from "./markdown.js";

const DUNDER_RE = /^__.*__$/;
const INLINE_MODULE_KINDS = new Set(["function", "method", "property"]);

function isVisibleMember(node) {
    if (node.extensions?.pdoc?.is_public === false) {
        return false;
    }
    if (DUNDER_RE.test(node.name) && !node.description) {
        return false;
    }
    return true;
}

/**
 * Page-worthy means: pdoc-visible AND either structural (module/class) or
 * documented.  This is the rule used for module-level inline rendering and
 * standalone file emission.  Class member inclusion uses the looser
 * `isVisibleMember` so the class member table still surfaces undocumented
 * public methods (the class itself is the documentation unit).
 */
function isPageWorthy(node) {
    if (!isVisibleMember(node)) {
        return false;
    }
    if (node.kind === "module" || node.kind === "class") {
        return true;
    }
    return Boolean(node.description);
}

function moduleTitle(node) {
    const fullname = node.extensions?.pdoc?.fullname || node.name;
    const parts = fullname.split(".");
    return parts.length >= 2 ? parts.slice(-2).join(".") : fullname;
}

/**
 * Return heading text with an explicit anchor when the auto-slug would
 * collide with an inline member anchor on a class page.  VitePress
 * auto-slugifies headings to lowercase, so `## Source` becomes
 * `id="source"`, which collides with a member `## source {#source}`.
 */
function sectionAnchor(text, memberAnchors) {
    if (!memberAnchors || !memberAnchors.size) {
        return text;
    }
    const autoSlug = text.toLowerCase().replace(/\s+/g, "-");
    if (memberAnchors.has(autoSlug)) {
        return `${text} {#${autoSlug}-section}`;
    }
    return text;
}

function renderSignatures(node, filePath, memberAnchors) {
    if (!node.signatures || !node.signatures.length) {
        return "";
    }
    const lines = [];
    const heading = node.signatures.length > 1 ? "Signatures" : "Signature";
    lines.push(renderHeading(2, sectionAnchor(heading, memberAnchors)), "");

    for (const signature of node.signatures) {
        const params = (signature.parameters || []).map((param) => param.name).join(", ");
        const label = `${node.name}(${params})`;
        lines.push(renderCodeInline(label), "");

        const paramRows = formatParameters(signature.parameters || []);
        const paramTable = renderTable(["Name", "Type", "Required", "Description"], paramRows);
        if (paramTable) {
            lines.push(renderHeading(3, "Parameters"), "", paramTable, "");
        }

        if (signature.returns?.name) {
            lines.push(renderHeading(3, "Returns"), "", renderCodeInline(signature.returns.name), "");
        }
    }

    return lines.join("\n");
}

function renderInlineMember(member) {
    const anchor = slugify(member.name);
    const lines = [];
    lines.push(renderHeading(2, `${member.name} {#${anchor}}`), "");

    const lifecycleBlock = renderLifecycle(member.lifecycle);
    if (lifecycleBlock) {
        lines.push(lifecycleBlock, "");
    }

    if (member.description) {
        lines.push(escapeText(member.description), "");
    }

    if (member.signatures?.length) {
        const heading = member.signatures.length > 1 ? "Signatures" : "Signature";
        lines.push(renderHeading(3, `${heading} {#${anchor}-${heading.toLowerCase()}}`), "");
        for (const signature of member.signatures) {
            const params = (signature.parameters || []).map((p) => p.name).join(", ");
            lines.push(renderCodeInline(`${member.name}(${params})`), "");
            const paramRows = formatParameters(signature.parameters || []);
            const paramTable = renderTable(["Name", "Type", "Required", "Description"], paramRows);
            if (paramTable) {
                lines.push(renderHeading(4, `Parameters {#${anchor}-parameters}`), "", paramTable, "");
            }
            if (signature.returns?.name) {
                lines.push(
                    renderHeading(4, `Returns {#${anchor}-returns}`),
                    "",
                    renderCodeInline(signature.returns.name),
                    "",
                );
            }
        }
    }

    const sourceValue = formatSource(member.source);
    if (sourceValue) {
        lines.push(renderHeading(3, `Source {#${anchor}-source}`), "", renderCodeInline(sourceValue), "");
    }

    return lines.join("\n");
}

function renderInlineMembersSection(node, index, predicate) {
    const children = index.childrenOf.get(node.id) || [];
    const visible = children.filter(isVisibleMember).filter(predicate || (() => true));
    if (!visible.length) {
        return "";
    }
    return visible.map(renderInlineMember).join("\n");
}

function renderChildrenSections(node, index, pathMap, filePath) {
    const children = index.childrenOf.get(node.id) || [];
    if (!children.length) {
        return "";
    }

    const submodules = children.filter((child) => child.kind === "module");
    const classes = children.filter((child) => child.kind === "class").filter(isVisibleMember);
    const others = children
        .filter((child) => !["module", "class", "method", "function", "property"].includes(child.kind))
        .filter(isVisibleMember);

    const lines = [];

    if (submodules.length) {
        lines.push(renderHeading(2, "Submodules"), "");
        const items = submodules.map((child) => linkToPath(child.name, pathMap.get(child.id), filePath));
        lines.push(renderList(items), "");
    }

    if (classes.length) {
        lines.push(renderHeading(2, "Classes"), "");
        const items = classes.map((child) => linkToPath(child.name, pathMap.get(child.id), filePath));
        lines.push(renderList(items), "");
    }

    if (others.length) {
        lines.push(renderHeading(2, "Members"), "");
        const items = others.map((child) => linkToPath(child.name, pathMap.get(child.id), filePath));
        lines.push(renderList(items), "");
    }

    return lines.join("\n");
}

function renderSource(node, memberAnchors) {
    const value = formatSource(node.source);
    if (!value) {
        return "";
    }
    return [renderHeading(2, sectionAnchor("Source", memberAnchors)), "", renderCodeInline(value), ""].join("\n");
}

export function renderPdocNode(node, index, filePath) {
    const fm = { id: node.id, kind: node.kind, source: "pdoc" };

    let memberAnchors;
    let inlineChildren;
    if (node.kind === "class") {
        const children = index.childrenOf.get(node.id) || [];
        inlineChildren = children.filter(isVisibleMember);
    } else if (node.kind === "module") {
        const children = index.childrenOf.get(node.id) || [];
        inlineChildren = children.filter(isPageWorthy).filter((c) => INLINE_MODULE_KINDS.has(c.kind));
    }
    if (inlineChildren && inlineChildren.length) {
        fm.member_ids = inlineChildren.map((c) => c.id);
        memberAnchors = new Set(inlineChildren.map((c) => slugify(c.name)));
    }

    const frontmatter = renderFrontmatter(fm);

    const title = node.kind === "module" ? moduleTitle(node) : normalizeTitle(node.name);

    const lines = [];
    lines.push(frontmatter);
    lines.push(renderHeading(1, title), "");

    const lifecycleBlock = renderLifecycle(node.lifecycle);
    if (lifecycleBlock) {
        lines.push(lifecycleBlock, "");
    }

    if (node.description) {
        lines.push(renderHeading(2, sectionAnchor("Overview", memberAnchors)), "", escapeText(node.description), "");
    }

    const signatureBlock = renderSignatures(node, filePath, memberAnchors);
    if (signatureBlock) {
        lines.push(signatureBlock);
    }

    if (node.kind === "class") {
        const membersBlock = renderInlineMembersSection(node, index);
        if (membersBlock) {
            lines.push(membersBlock);
        }
    } else {
        const childrenBlock = renderChildrenSections(node, index, index.pathMap, filePath);
        if (childrenBlock) {
            lines.push(childrenBlock);
        }
        if (node.kind === "module") {
            const membersBlock = renderInlineMembersSection(
                node,
                index,
                (c) => INLINE_MODULE_KINDS.has(c.kind) && isPageWorthy(c),
            );
            if (membersBlock) {
                lines.push(membersBlock);
            }
        }
    }

    const sourceBlock = renderSource(node, memberAnchors);
    if (sourceBlock) {
        lines.push(sourceBlock);
    }

    return { filePath, content: lines.join("\n").trimEnd() + "\n" };
}

export function renderPdocBundle(bundle) {
    const index = buildCanonicalIndex(bundle);
    const outputs = new Map();
    const pathMap = buildPdocPathMap(bundle, index);
    index.pathMap = pathMap;
    for (const node of bundle.nodes) {
        const filePath = pathMap.get(node.id);
        if (filePath.includes("#")) {
            continue; // rendered inline on parent module or class page
        }
        if (!isPageWorthy(node)) {
            continue;
        }
        const { content } = renderPdocNode(node, index, filePath);
        outputs.set(filePath, content);
    }
    return outputs;
}
