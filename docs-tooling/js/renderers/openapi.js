import { buildCanonicalIndex } from "../utils/index-canonical.js";
import {
  formatMembers,
  formatParameters,
  formatSource,
  linkToPath,
  normalizeTitle,
  renderCodeInline,
  renderFrontmatter,
  renderHeading,
  renderTable,
  slugify,
} from "./markdown.js";

function endpointGroup(node) {
  const tags = node.tags || [];
  if (tags.length) {
    return slugify(tags[0]);
  }
  const pathValue = node.extensions?.openapi?.path || "";
  const first = pathValue.split("/").filter(Boolean)[0] || "rest";
  return slugify(first);
}

function endpointSlug(node) {
  const idPart = node.extensions?.openapi?.operationId;
  if (idPart) {
    return slugify(idPart);
  }
  const method = node.extensions?.openapi?.method || "get";
  const pathValue = node.extensions?.openapi?.path || "";
  return slugify(`${method}-${pathValue}`);
}

function responseCodeFromId(node) {
  const match = node.id.match(/:response:([^:]+)$/);
  return match ? match[1] : slugify(node.name || "response");
}

function openapiPathForNode(node, index) {
  if (node.kind === "schema" || node.kind === "enum") {
    return `rest/schemas/${slugify(node.name)}.md`;
  }
  if (node.kind === "endpoint") {
    return `rest/${endpointGroup(node)}/${endpointSlug(node)}.md`;
  }
  if (node.kind === "response") {
    const parent = index.parentOf.get(node.id);
    if (parent && parent.kind === "endpoint") {
      const base = openapiPathForNode(parent, index).replace(/\.md$/, "");
      return `${base}/responses/${slugify(responseCodeFromId(node))}.md`;
    }
  }
  return `rest/${slugify(node.name)}.md`;
}

function renderEndpoint(node, index, pathMap, filePath) {
  const lines = [];
  const http = node.extensions?.openapi;

  if (node.description) {
    lines.push(renderHeading(2, "Overview"), "", node.description, "");
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
      lines.push(renderHeading(3, renderCodeInline(response.name)));
      const responseSignature = response.signatures?.[0];
      if (responseSignature?.returns?.name) {
        const target = responseSignature.returns.link
          ? linkToPath(
              responseSignature.returns.name,
              pathMap.get(responseSignature.returns.link),
              filePath
            )
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
    lines.push(renderHeading(2, "Overview"), "", node.description, "");
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
  const frontmatter = renderFrontmatter({
    id: node.id,
    kind: node.kind,
    source: "openapi",
  });

  const lines = [];
  lines.push(frontmatter);
  lines.push(renderHeading(1, normalizeTitle(node.name)), "");

  if (node.kind === "endpoint") {
    lines.push(renderEndpoint(node, index, pathMap, filePath));
  } else if (node.kind === "schema" || node.kind === "enum") {
    lines.push(renderSchema(node, filePath));
  }

  return { filePath, content: lines.join("\n").trimEnd() + "\n" };
}

export function renderOpenApiBundle(bundle) {
  const index = buildCanonicalIndex(bundle);
  const outputs = new Map();
  const pathMap = new Map();
  for (const node of bundle.nodes) {
    pathMap.set(node.id, openapiPathForNode(node, index));
  }
  index.pathMap = pathMap;
  for (const node of bundle.nodes) {
    const filePath = pathMap.get(node.id);
    const { content } = renderOpenApiNode(node, index, pathMap, filePath);
    outputs.set(filePath, content);
  }
  return outputs;
}
