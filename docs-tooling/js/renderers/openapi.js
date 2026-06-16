import { buildCanonicalIndex } from "../utils/index-canonical.js";
import { buildOpenApiPathMap, openapiResponseAnchorForNode } from "../utils/path-map.js";
import {
    escapeText,
    formatMembers,
    formatParameters,
    formatSource,
    linkToPath,
    normalizeTitle,
    renderCodeInline,
    renderFrontmatter,
    renderHeading,
    renderTable,
} from "./markdown.js";
import path from "node:path";

function renderEndpoint(node, index, pathMap, filePath) {
    const lines = [];
    const http = node.extensions?.openapi;

    if (node.description) {
        lines.push(renderHeading(2, "Overview"), "", escapeText(node.description), "");
    }

    if (node.signatures && node.signatures.length) {
        const signature = node.signatures[0];
        lines.push(renderHeading(2, "Signature"), "");
        if (http?.method && http?.path) {
            lines.push(renderCodeInline(`${http.method.toUpperCase()} ${http.path}`), "");
        }

        const params = formatParameters(signature.parameters || []);
        const paramTable = renderTable(["Name", "Type", "Required", "Description"], params);
        if (paramTable) {
            lines.push(renderHeading(3, "Parameters"), "", paramTable, "");
        }

        if (signature.returns?.name) {
            const target = signature.returns.link
                ? linkToPath(signature.returns.name, pathMap.get(signature.returns.link), filePath)
                : renderCodeInline(signature.returns.name);
            lines.push(renderHeading(3, "Returns"), "", target, "");
        }
    }

    const responses = (index.childrenOf.get(node.id) || []).filter((child) => child.kind === "response");
    if (responses.length) {
        lines.push(renderHeading(2, "Responses"), "");
        for (const response of responses) {
            lines.push(
                renderHeading(3, `${renderCodeInline(response.name)} {#${openapiResponseAnchorForNode(response)}}`),
            );
            const responseSignature = response.signatures?.[0];
            if (responseSignature?.returns?.name) {
                const target = responseSignature.returns.link
                    ? linkToPath(responseSignature.returns.name, pathMap.get(responseSignature.returns.link), filePath)
                    : renderCodeInline(responseSignature.returns.name);
                lines.push("", `Returns ${target}`, "");
            } else {
                lines.push("");
            }
        }
    }

    const source = formatSource(node.source);
    if (source) {
        lines.push(renderHeading(2, "Source"), "", renderCodeInline(source), "");
    }

    return lines.join("\n");
}

function renderSchema(node, filePath) {
    const lines = [];
    if (node.description) {
        lines.push(renderHeading(2, "Overview"), "", escapeText(node.description), "");
    }

    const members = formatMembers(node.members || [], "property");
    const table = renderTable(["Name", "Type", "Required", "Default", "Description"], members);
    if (table) {
        lines.push(renderHeading(2, "Properties"), "", table, "");
    }

    const source = formatSource(node.source);
    if (source) {
        lines.push(renderHeading(2, "Source"), "", renderCodeInline(source), "");
    }

    return lines.join("\n");
}

export function renderOpenApiNode(node, index, pathMap, filePath) {
    const frontmatterData = {
        title: node.displayName,
        id: node.id,
        kind: node.kind,
        source: "openapi",
    };
    if (node.kind === "endpoint") {
        const responses = (index.childrenOf.get(node.id) || []).filter((child) => child.kind === "response");
        if (responses.length) {
            frontmatterData.member_ids = responses.map((response) => response.id);
        }
    }
    const frontmatter = renderFrontmatter(frontmatterData);

    const lines = [];
    lines.push(frontmatter);
    lines.push(renderHeading(1, normalizeTitle(node.displayName || node.name)), "");

    if (node.kind === "endpoint") {
        lines.push(renderEndpoint(node, index, pathMap, filePath));
    } else if (node.kind === "schema" || node.kind === "enum") {
        lines.push(renderSchema(node, filePath));
    }

    return { filePath, content: lines.join("\n").trimEnd() + "\n" };
}

function renderEndpointGroupIndex(groupName, endpoints, pathMap, groupIndexPath) {
    const id = `rest:index:${groupName}`;
    const lines = [
        renderFrontmatter({ title: groupName, id, kind: "index", source: "openapi" }),
        renderHeading(1, groupName),
        "",
    ];
    for (const node of endpoints) {
        const label = node.displayName || node.name;
        lines.push(`- ${linkToPath(label, pathMap.get(node.id), groupIndexPath)}`);
    }
    lines.push("");
    return lines.join("\n").trimEnd() + "\n";
}

export function renderOpenApiBundle(bundle) {
    const index = buildCanonicalIndex(bundle);
    const outputs = new Map();
    const pathMap = buildOpenApiPathMap(bundle, index);
    index.pathMap = pathMap;
    for (const node of bundle.nodes) {
        const filePath = pathMap.get(node.id);
        if (filePath.includes("#")) {
            continue;
        }
        const { content } = renderOpenApiNode(node, index, pathMap, filePath);
        outputs.set(filePath, content);
    }

    const endpointsByGroup = new Map();
    for (const node of bundle.nodes) {
        if (node.kind !== "endpoint") continue;
        const filePath = pathMap.get(node.id);
        if (!filePath) continue;
        const groupDir = path.posix.dirname(filePath);
        if (!endpointsByGroup.has(groupDir)) endpointsByGroup.set(groupDir, []);
        endpointsByGroup.get(groupDir).push(node);
    }
    for (const [groupDir, endpoints] of endpointsByGroup) {
        const groupName = path.posix.basename(groupDir);
        const groupIndexPath = path.posix.join(groupDir, "index.md");
        endpoints.sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name));
        outputs.set(groupIndexPath, renderEndpointGroupIndex(groupName, endpoints, pathMap, groupIndexPath));
    }

    return outputs;
}
