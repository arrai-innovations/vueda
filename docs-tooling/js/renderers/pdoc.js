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
    renderList,
    renderTable,
    slugify,
} from "./markdown.js";

function renderSignatures(node, filePath) {
    if (!node.signatures || !node.signatures.length) {
        return "";
    }
    const lines = [];
    const heading = node.signatures.length > 1 ? "Signatures" : "Signature";
    lines.push(renderHeading(2, heading), "");

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

    if (member.description) {
        lines.push(escapeText(member.description), "");
    }

    if (member.signatures?.length) {
        const heading = member.signatures.length > 1 ? "Signatures" : "Signature";
        lines.push(renderHeading(3, heading), "");
        for (const signature of member.signatures) {
            const params = (signature.parameters || []).map((p) => p.name).join(", ");
            lines.push(renderCodeInline(`${member.name}(${params})`), "");
            const paramRows = formatParameters(signature.parameters || []);
            const paramTable = renderTable(["Name", "Type", "Required", "Description"], paramRows);
            if (paramTable) {
                lines.push(renderHeading(4, "Parameters"), "", paramTable, "");
            }
            if (signature.returns?.name) {
                lines.push(renderHeading(4, "Returns"), "", renderCodeInline(signature.returns.name), "");
            }
        }
    }

    const sourceValue = formatSource(member.source);
    if (sourceValue) {
        lines.push(renderHeading(3, "Source"), "", renderCodeInline(sourceValue), "");
    }

    return lines.join("\n");
}

function renderInlineMembersSection(node, index) {
    const children = index.childrenOf.get(node.id) || [];
    const publicChildren = children.filter(
        (child) => child.extensions?.pdoc?.is_public !== false && !(/^__.*__$/.test(child.name) && !child.description),
    );
    if (!publicChildren.length) {
        return "";
    }
    return publicChildren.map(renderInlineMember).join("\n");
}

function renderChildrenSections(node, index, pathMap, filePath) {
    const children = index.childrenOf.get(node.id) || [];
    if (!children.length) {
        return "";
    }

    const methods = children.filter((child) => child.kind === "method" || child.kind === "function");
    const properties = children.filter((child) => child.kind === "property");
    const others = children.filter((child) => !["method", "function", "property"].includes(child.kind));

    const lines = [];

    if (properties.length) {
        lines.push(renderHeading(2, "Properties"), "");
        const items = properties.map((child) => linkToPath(child.name, pathMap.get(child.id), filePath));
        lines.push(renderList(items), "");
    }

    if (methods.length) {
        lines.push(renderHeading(2, "Methods"), "");
        const items = methods.map((child) => linkToPath(child.name, pathMap.get(child.id), filePath));
        lines.push(renderList(items), "");
    }

    if (others.length) {
        lines.push(renderHeading(2, "Members"), "");
        const items = others.map((child) => linkToPath(child.name, pathMap.get(child.id), filePath));
        lines.push(renderList(items), "");
    }

    return lines.join("\n");
}

function renderSource(node) {
    const value = formatSource(node.source);
    if (!value) {
        return "";
    }
    return [renderHeading(2, "Source"), "", renderCodeInline(value), ""].join("\n");
}

export function renderPdocNode(node, index, filePath) {
    const fm = { id: node.id, kind: node.kind, source: "pdoc" };

    if (node.kind === "class") {
        const children = index.childrenOf.get(node.id) || [];
        const publicChildren = children.filter(
            (c) => c.extensions?.pdoc?.is_public !== false && !(/^__.*__$/.test(c.name) && !c.description),
        );
        if (publicChildren.length) {
            fm.member_ids = publicChildren.map((c) => c.id);
        }
    }

    const frontmatter = renderFrontmatter(fm);

    // For modules, qualify the title with the parent segment so pages like
    // "viewsets" read as "workflow.viewsets" in headings and browser tabs.
    const title =
        node.kind === "module"
            ? (() => {
                  const fullname = node.extensions?.pdoc?.fullname || node.name;
                  const parts = fullname.split(".");
                  return parts.length >= 2 ? parts.slice(-2).join(".") : fullname;
              })()
            : normalizeTitle(node.name);

    const lines = [];
    lines.push(frontmatter);
    lines.push(renderHeading(1, title), "");

    if (node.description) {
        lines.push(renderHeading(2, "Overview"), "", escapeText(node.description), "");
    }

    const signatureBlock = renderSignatures(node, filePath);
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
    }

    const sourceBlock = renderSource(node);
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
            continue; // rendered inline on parent class page
        }
        const { content } = renderPdocNode(node, index, filePath);
        outputs.set(filePath, content);
    }
    return outputs;
}
