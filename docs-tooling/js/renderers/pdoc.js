import { buildCanonicalIndex } from "../utils/index-canonical.js";
import {
  formatParameters,
  formatSource,
  linkToPath,
  normalizeTitle,
  escapeText,
  renderCodeInline,
  renderFrontmatter,
  renderHeading,
  renderList,
  renderTable,
  slugify,
} from "./markdown.js";

function modulePath(node) {
  const moduleName = node.extensions?.pdoc?.modulename || node.name;
  const pathPart = moduleName.replace(/\./g, "/");
  return `py/${pathPart}.md`;
}

function classDir(node, moduleFile) {
  const baseDir = moduleFile.replace(/\.md$/, "");
  return `${baseDir}/${slugify(node.name)}`;
}

function pdocPathForNode(node, index) {
  if (node.kind === "module") {
    return modulePath(node);
  }
  const parent = index.parentOf.get(node.id);
  if (parent?.kind === "class") {
    const moduleAncestor = index.parentOf.get(parent.id) || parent;
    const moduleFile = modulePath(moduleAncestor);
    const dir = classDir(parent, moduleFile);
    return `${dir}/${slugify(node.name)}.md`;
  }
  const moduleAncestor =
    parent?.kind === "module" ? parent : parent ? index.parentOf.get(parent.id) : null;
  if (moduleAncestor && moduleAncestor.kind === "module") {
    const moduleFile = modulePath(moduleAncestor);
    const dir = moduleFile.replace(/\.md$/, "");
    return `${dir}/${slugify(node.name)}.md`;
  }
  return `py/${slugify(node.name)}.md`;
}

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

function renderChildrenSections(node, index, pathMap, filePath) {
  const children = index.childrenOf.get(node.id) || [];
  if (!children.length) {
    return "";
  }

  const methods = children.filter((child) => child.kind === "method" || child.kind === "function");
  const properties = children.filter((child) => child.kind === "property");
  const others = children.filter(
    (child) => !["method", "function", "property"].includes(child.kind)
  );

  const lines = [];

  if (properties.length) {
    lines.push(renderHeading(2, "Properties"), "");
    const items = properties.map((child) =>
      linkToPath(child.name, pathMap.get(child.id), filePath)
    );
    lines.push(renderList(items), "");
  }

  if (methods.length) {
    lines.push(renderHeading(2, "Methods"), "");
    const items = methods.map((child) =>
      linkToPath(child.name, pathMap.get(child.id), filePath)
    );
    lines.push(renderList(items), "");
  }

  if (others.length) {
    lines.push(renderHeading(2, "Members"), "");
    const items = others.map((child) =>
      linkToPath(child.name, pathMap.get(child.id), filePath)
    );
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

export function renderPdocNode(node, index) {
  const filePath = pdocPathForNode(node, index);
  const frontmatter = renderFrontmatter({
    id: node.id,
    kind: node.kind,
    source: "pdoc",
  });

  const lines = [];
  lines.push(frontmatter);
  lines.push(renderHeading(1, normalizeTitle(node.name)), "");

  if (node.description) {
    lines.push(renderHeading(2, "Overview"), "", escapeText(node.description), "");
  }

  const signatureBlock = renderSignatures(node, filePath);
  if (signatureBlock) {
    lines.push(signatureBlock);
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

export function renderPdocBundle(bundle) {
  const index = buildCanonicalIndex(bundle);
  const outputs = new Map();
  const pathMap = new Map();
  for (const node of bundle.nodes) {
    pathMap.set(node.id, pdocPathForNode(node, index));
  }
  index.pathMap = pathMap;
  for (const node of bundle.nodes) {
    const { filePath, content } = renderPdocNode(node, index);
    outputs.set(filePath, content);
  }
  return outputs;
}
