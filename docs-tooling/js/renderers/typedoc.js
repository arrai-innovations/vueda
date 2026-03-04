import { buildCanonicalIndex } from "../utils/index-canonical.js";
import { buildTypedocPathMap } from "../utils/path-map.js";
import {
    formatSource,
    linkToPath,
    normalizeTitle,
    renderCodeInline,
    renderFrontmatter,
    renderHeading,
    renderList,
    renderTable,
} from "./markdown.js";

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
        param.optional === true ? "no" : param.optional === false ? "yes" : "",
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

function renderChildrenSections(node, index, pathMap, filePath) {
    const children = index.childrenOf.get(node.id) || [];
    if (!children.length) {
        return "";
    }

    const methods = children.filter((child) => child.kind === "method" || child.kind === "function");
    const properties = children.filter((child) => child.kind === "property");
    const types = children.filter(
        (child) => child.kind === "type" || child.kind === "enum" || child.kind === "interface",
    );

    const lines = [];

    const childLink = (child) => {
        const link = linkToPath(child.name, pathMap.get(child.id), filePath);
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
        lines.push(renderHeading(2, "Properties"), "");
        lines.push(renderList(properties.map(childLink)), "");
    }

    if (methods.length) {
        lines.push(renderHeading(2, "Methods"), "");
        lines.push(renderList(methods.map(childLink)), "");
    }

    if (types.length) {
        lines.push(renderHeading(2, "Types"), "");
        for (const type of types) {
            lines.push(renderHeading(3, linkToPath(type.name, pathMap.get(type.id), filePath)), "");
            if (type.description) {
                lines.push(type.description, "");
            }
            if (type.typeDefinition) {
                lines.push(renderCodeInline(`${type.name} = ${type.typeDefinition.name}`), "");
            }
            if (type.members?.length) {
                const rows = type.members.map((m) => [m.name, m.type?.name || "", m.description || ""]);
                const table = renderTable(["Name", "Type", "Description"], rows);
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
    const rows = node.members.map((m) => [m.name, m.type?.name || "", m.description || ""]);
    const table = renderTable(["Name", "Type", "Description"], rows);
    if (!table) {
        return "";
    }
    return [renderHeading(2, "Properties"), "", table, ""].join("\n");
}

function renderSource(node) {
    const value = formatSource(node.source);
    if (!value) {
        return "";
    }
    return [renderHeading(2, "Source"), "", renderCodeInline(value), ""].join("\n");
}

export function renderTypeDocNode(node, index, filePath) {
    const frontmatter = renderFrontmatter({
        id: node.id,
        kind: node.kind,
        source: "typedoc",
    });

    const lines = [];
    lines.push(frontmatter);
    lines.push(renderHeading(1, normalizeTitle(node.name)), "");

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

    const childrenBlock = renderChildrenSections(node, index, index.pathMap, filePath);
    if (childrenBlock) {
        lines.push(childrenBlock);
    }

    const sourceBlock = renderSource(node);
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
        const { content } = renderTypeDocNode(node, index, filePath);
        outputs.set(filePath, content);
    }
    return outputs;
}
