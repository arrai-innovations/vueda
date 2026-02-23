import { slugify } from "./slugify.js";

function typedocModulePath(node) {
    const sourceFile = node.source?.file;
    if (sourceFile) {
        const withoutExt = sourceFile.replace(/\.[^.]+$/, "");
        const scoped = withoutExt.startsWith("client/lib/") ? withoutExt.slice("client/lib/".length) : withoutExt;
        return `js/${scoped}.md`;
    }
    return `js/${slugify(node.name)}.md`;
}

function typedocClassDir(node, moduleFile) {
    const baseDir = moduleFile.replace(/\.md$/, "");
    return `${baseDir}/${slugify(node.name)}`;
}

function typedocKindSegment(kind) {
    switch (kind) {
        case "property":
            return "properties";
        case "method":
            return "methods";
        case "function":
            return "functions";
        case "enum":
        case "type":
        case "interface":
            return "types";
        default:
            return "members";
    }
}

export function typedocPathForNode(node, index) {
    if (node.kind === "module" || node.kind === "namespace") {
        return typedocModulePath(node);
    }
    const parent = index.parentOf.get(node.id);
    if (parent?.kind === "class") {
        const moduleAncestor = index.parentOf.get(parent.id) || parent;
        const moduleFile = typedocModulePath(moduleAncestor);
        const dir = typedocClassDir(parent, moduleFile);
        return `${dir}/${typedocKindSegment(node.kind)}/${slugify(node.name)}.md`;
    }
    const moduleAncestor = parent?.kind === "module" ? parent : parent ? index.parentOf.get(parent.id) : null;
    if (moduleAncestor && (moduleAncestor.kind === "module" || moduleAncestor.kind === "namespace")) {
        const moduleFile = typedocModulePath(moduleAncestor);
        const dir = moduleFile.replace(/\.md$/, "");
        return `${dir}/${typedocKindSegment(node.kind)}/${slugify(node.name)}.md`;
    }
    return `js/${typedocKindSegment(node.kind)}/${slugify(node.name)}.md`;
}

export function buildTypedocPathMap(bundle, index) {
    const pathMap = new Map();
    for (const node of bundle.nodes || []) {
        pathMap.set(node.id, typedocPathForNode(node, index));
    }
    return pathMap;
}

function pdocModulePath(node) {
    const moduleName = node.extensions?.pdoc?.modulename || node.name;
    const pathPart = moduleName.replace(/\./g, "/");
    return `py/${pathPart}.md`;
}

function pdocClassDir(node, moduleFile) {
    const baseDir = moduleFile.replace(/\.md$/, "");
    return `${baseDir}/${slugify(node.name)}`;
}

export function pdocPathForNode(node, index) {
    if (node.kind === "module") {
        return pdocModulePath(node);
    }
    const parent = index.parentOf.get(node.id);
    if (parent?.kind === "class") {
        const moduleAncestor = index.parentOf.get(parent.id) || parent;
        const moduleFile = pdocModulePath(moduleAncestor);
        const dir = pdocClassDir(parent, moduleFile);
        return `${dir}/${slugify(node.name)}.md`;
    }
    const moduleAncestor = parent?.kind === "module" ? parent : parent ? index.parentOf.get(parent.id) : null;
    if (moduleAncestor && moduleAncestor.kind === "module") {
        const moduleFile = pdocModulePath(moduleAncestor);
        const dir = moduleFile.replace(/\.md$/, "");
        return `${dir}/${slugify(node.name)}.md`;
    }
    return `py/${slugify(node.name)}.md`;
}

export function buildPdocPathMap(bundle, index) {
    const pathMap = new Map();
    for (const node of bundle.nodes || []) {
        pathMap.set(node.id, pdocPathForNode(node, index));
    }
    return pathMap;
}

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

export function openapiPathForNode(node, index) {
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

export function buildOpenApiPathMap(bundle, index) {
    const pathMap = new Map();
    for (const node of bundle.nodes || []) {
        pathMap.set(node.id, openapiPathForNode(node, index));
    }
    return pathMap;
}

export function vueDocgenComponentPath(node) {
    return `vue/components/${slugify(node.name)}.md`;
}

export function vueDocgenSlotsPath(node) {
    return `vue/components/${slugify(node.name)}/slots.md`;
}

export function vueDocgenEventsPath(node) {
    return `vue/components/${slugify(node.name)}/events.md`;
}

export function buildVueDocgenPathMap(bundle) {
    const pathMap = new Map();
    for (const node of bundle.nodes || []) {
        if (node.kind === "component") {
            pathMap.set(node.id, vueDocgenComponentPath(node));
            pathMap.set(`${node.id}:slots`, vueDocgenSlotsPath(node));
            pathMap.set(`${node.id}:events`, vueDocgenEventsPath(node));
        }
    }
    return pathMap;
}
