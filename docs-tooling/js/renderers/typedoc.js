import { buildCanonicalIndex } from "../utils/index-canonical.js";
import { buildTypedocPathMap } from "../utils/path-map.js";
import {
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

function memberRows(members) {
    return members.map((m) => [m.name, m.type?.name || "", m.description || ""]);
}

function renderTypeRef(typeRef, index, filePath) {
    if (!typeRef?.name) return "";
    if (typeRef.link) {
        const node = index.byId.get(typeRef.link);
        if (node) {
            const targetPath = index.pathMap.get(node.id);
            if (targetPath) {
                return linkToPath(typeRef.name, targetPath, filePath);
            }
        }
    }
    return renderCodeInline(typeRef.name);
}

function formatParametersTypedoc(parameters, index, filePath) {
    return (parameters || []).map((param) => [
        param.name || "",
        renderTypeRef(param.type, index, filePath),
        // TypeDoc serializes isOptional only when true, so undefined is required.
        param.optional ? "no" : "yes",
        param.description || "",
    ]);
}

function renderSignatures(node, index, filePath) {
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

        const paramRows = formatParametersTypedoc(signature.parameters || [], index, filePath);
        const paramTable = renderTable(["Name", "Type", "Required", "Description"], paramRows);
        if (paramTable) {
            lines.push(renderHeading(3, "Parameters"), "", paramTable, "");
        }

        if (signature.returns?.name) {
            const returnsLines = [renderHeading(3, "Returns"), "", renderTypeRef(signature.returns, index, filePath)];
            if (signature.returns.description) {
                returnsLines.push("", signature.returns.description);
            }
            returnsLines.push("");
            lines.push(...returnsLines);
        }

        if (signature.throws?.length) {
            const items = signature.throws.map((item) => item.name);
            lines.push(renderHeading(3, "Throws"), "", renderList(items), "");
        }
    }

    return lines.join("\n");
}

function sectionAnchor(text, memberAnchors) {
    if (!memberAnchors || !memberAnchors.size) {
        return text;
    }
    const autoSlug = slugify(text);
    if (memberAnchors.has(autoSlug)) {
        return `${text} {#${autoSlug}-section}`;
    }
    return text;
}

function isInlineMember(node) {
    return node.kind === "property";
}

function inlineMemberAnchors(node, index) {
    const children = index.childrenOf.get(node.id) || [];
    const inlineChildren = children.filter(isInlineMember);
    if (!inlineChildren.length) {
        return { inlineChildren, memberAnchors: undefined };
    }
    return {
        inlineChildren,
        memberAnchors: new Set(inlineChildren.map((child) => slugify(child.name))),
    };
}

function renderPropertyDetail(node, index, filePath) {
    const lines = [];
    lines.push(renderHeading(3, `${node.name} {#${slugify(node.name)}}`), "");

    const lifecycleBlock = renderLifecycle(node.lifecycle);
    if (lifecycleBlock) {
        lines.push(lifecycleBlock, "");
    }

    if (node.description) {
        lines.push(node.description, "");
    }

    if (node.propertyType?.name) {
        lines.push(`Type: ${renderTypeRef(node.propertyType, index, filePath)}`, "");
    }

    const source = formatSource(node.source);
    if (source) {
        lines.push(`Source: ${renderCodeInline(source)}`, "");
    }

    return lines.join("\n");
}

function renderChildrenSections(node, index, filePath) {
    const children = index.childrenOf.get(node.id) || [];
    if (!children.length) {
        return "";
    }

    const methods = children.filter((child) => child.kind === "method" || child.kind === "function");
    const properties = children.filter((child) => child.kind === "property");
    const types = children.filter(
        (child) => child.kind === "type" || child.kind === "enum" || child.kind === "interface",
    );

    const { memberAnchors } = inlineMemberAnchors(node, index);
    const lines = [];

    const childLink = (child) => {
        const link = linkToPath(child.name, index.pathMap.get(child.id), filePath);
        const typeName = child.propertyType?.name;
        const typeHint = typeName && typeName !== "object" ? ` \`${typeName}\`` : "";
        if (!child.description) {
            return typeHint ? `${link}${typeHint}` : link;
        }
        const collapsed = child.description
            .replace(/```[\s\S]*?```/g, "")
            .replace(/\s+/g, " ")
            .trim();
        const sentenceMatch = collapsed.match(/^.*?\.(?= |$)/);
        const summary = sentenceMatch ? sentenceMatch[0] : collapsed;
        return `${link}${typeHint} - ${summary}`;
    };

    if (properties.length) {
        lines.push(renderHeading(2, sectionAnchor("Properties", memberAnchors)), "");
        for (const property of properties) {
            lines.push(renderPropertyDetail(property, index, filePath));
        }
    }

    if (methods.length) {
        lines.push(renderHeading(2, sectionAnchor("Methods", memberAnchors)), "");
        lines.push(renderList(methods.map(childLink)), "");
    }

    if (types.length) {
        lines.push(renderHeading(2, sectionAnchor("Types", memberAnchors)), "");
        for (const type of types) {
            lines.push(renderHeading(3, linkToPath(type.name, index.pathMap.get(type.id), filePath)), "");
            if (type.description) {
                lines.push(type.description, "");
            }
            if (type.typeDefinition) {
                lines.push(renderCodeInline(`${type.name} = ${type.typeDefinition.name}`), "");
            }
            if (type.members?.length) {
                const table = renderTable(["Name", "Type", "Description"], memberRows(type.members));
                if (table) lines.push(table, "");
            }
        }
    }

    return lines.join("\n");
}

function renderExamples(node) {
    if (!node.examples || !node.examples.length) {
        return "";
    }
    const lines = [renderHeading(2, "Examples"), ""];
    for (const example of node.examples) {
        const lang = example.lang || "";
        lines.push("```" + lang);
        lines.push((example.content || "").trimEnd());
        lines.push("```");
        lines.push("");
    }
    return lines.join("\n");
}

function renderTypeDefinition(node) {
    if (!node.typeDefinition) {
        return "";
    }
    return [renderHeading(2, "Type"), "", renderCodeInline(`${node.name} = ${node.typeDefinition.name}`), ""].join(
        "\n",
    );
}

function renderTypeMembers(node) {
    if (!node.members || !node.members.length) {
        return "";
    }
    const table = renderTable(["Name", "Type", "Description"], memberRows(node.members));
    if (!table) {
        return "";
    }
    return [renderHeading(2, "Properties"), "", table, ""].join("\n");
}

function renderSource(node, memberAnchors) {
    const value = formatSource(node.source);
    if (!value) {
        return "";
    }
    return [renderHeading(2, sectionAnchor("Source", memberAnchors)), "", renderCodeInline(value), ""].join("\n");
}

export function renderTypeDocNode(node, index, filePath) {
    const { inlineChildren, memberAnchors } = inlineMemberAnchors(node, index);
    const frontmatterData = {
        id: node.id,
        kind: node.kind,
        source: "typedoc",
    };
    if (inlineChildren.length) {
        frontmatterData.member_ids = inlineChildren.map((child) => child.id);
    }
    const frontmatter = renderFrontmatter(frontmatterData);

    const lines = [];
    lines.push(frontmatter);
    lines.push(renderHeading(1, normalizeTitle(node.name)), "");

    const lifecycleBlock = renderLifecycle(node.lifecycle);
    if (lifecycleBlock) {
        lines.push(lifecycleBlock, "");
    }

    if (node.description) {
        lines.push(renderHeading(2, "Overview"), "", node.description, "");
    }

    if (node.propertyType?.name) {
        lines.push(renderHeading(2, "Type"), "", renderTypeRef(node.propertyType, index, filePath), "");
    }

    const signatureBlock = renderSignatures(node, index, filePath);
    if (signatureBlock) {
        lines.push(signatureBlock);
    }

    const examplesBlock = renderExamples(node);
    if (examplesBlock) {
        lines.push(examplesBlock);
    }

    const typeDefBlock = renderTypeDefinition(node);
    if (typeDefBlock) {
        lines.push(typeDefBlock);
    }

    const typeMembersBlock = renderTypeMembers(node);
    if (typeMembersBlock) {
        lines.push(typeMembersBlock);
    }

    const childrenBlock = renderChildrenSections(node, index, filePath);
    if (childrenBlock) {
        lines.push(childrenBlock);
    }

    const sourceBlock = renderSource(node, memberAnchors);
    if (sourceBlock) {
        lines.push(sourceBlock);
    }

    return { filePath, content: lines.join("\n").trimEnd() + "\n" };
}

export function renderTypeDocBundle(bundle) {
    const index = buildCanonicalIndex(bundle);
    const outputs = new Map();
    const pathMap = buildTypedocPathMap(bundle, index);
    index.pathMap = pathMap;
    for (const node of bundle.nodes) {
        const filePath = pathMap.get(node.id);
        if (filePath.includes("#")) {
            continue;
        }
        const { content } = renderTypeDocNode(node, index, filePath);
        outputs.set(filePath, content);
    }
    return outputs;
}
