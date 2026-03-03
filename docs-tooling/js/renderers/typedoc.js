import { buildCanonicalIndex } from "../utils/index-canonical.js";
import { buildTypedocPathMap } from "../utils/path-map.js";
import {
    formatParameters,
    formatSource,
    linkToPath,
    normalizeTitle,
    renderCodeInline,
    renderFrontmatter,
    renderHeading,
    renderList,
    renderTable,
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
            const returnsLines = [renderHeading(3, "Returns"), "", renderCodeInline(signature.returns.name)];
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
        if (!child.description) {
            return link;
        }
        const summary = child.description.split(/\n/)[0].trimEnd();
        return `${link} - ${summary}`;
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
        lines.push(renderList(types.map(childLink)), "");
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

    const signatureBlock = renderSignatures(node, filePath);
    if (signatureBlock) {
        lines.push(signatureBlock);
    }

    const examplesBlock = renderExamples(node);
    if (examplesBlock) {
        lines.push(examplesBlock);
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
