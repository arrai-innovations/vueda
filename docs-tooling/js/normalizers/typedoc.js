/**
 * Normalize TypeDoc JSON output into the canonical schema.
 */
import { Normalizer } from "../core.js";
import { compact } from "../utils/compact.js";
import { deprecatedLifecycle } from "../utils/lifecycle.js";
import { getRepoRoot, normalizeSourceFile } from "../utils/source.js";

const KIND_MAP = new Map([
    [1, "module"], // Project
    [2, "module"],
    [4, "namespace"],
    [8, "enum"],
    [16, "property"],
    [32, "property"], // Variable
    [64, "function"],
    [128, "class"],
    [256, "interface"],
    [512, "method"], // Constructor
    [1024, "property"],
    [2048, "method"],
    [4096, "function"], // CallSignature
    [8192, "function"], // IndexSignature
    [16384, "function"], // ConstructorSignature
    [65536, "type"],
    [262144, "property"], // Accessor
    [2097152, "type"], // TypeAlias
]);

const KIND_NAME_MAP = new Map([
    [1, "Project"],
    [2, "Module"],
    [4, "Namespace"],
    [8, "Enum"],
    [16, "EnumMember"],
    [32, "Variable"],
    [64, "Function"],
    [128, "Class"],
    [256, "Interface"],
    [512, "Constructor"],
    [1024, "Property"],
    [2048, "Method"],
    [4096, "CallSignature"],
    [8192, "IndexSignature"],
    [16384, "ConstructorSignature"],
    [65536, "TypeLiteral"],
    [262144, "Accessor"],
    [2097152, "TypeAlias"],
]);

const ALLOWED_KINDS = new Set([
    "module",
    "namespace",
    "class",
    "interface",
    "function",
    "method",
    "property",
    "enum",
    "type",
]);

function contentText(parts) {
    return parts?.map((part) => part.text).join("") ?? "";
}

function stripSectionMarkers(text) {
    return text
        .split("\n")
        .filter((line) => !/^\s*\/\/\s*\*{2,}/.test(line))
        .join("\n")
        .trim();
}

function docId(node, kind, contextPath = []) {
    const name = node.name || "anonymous";
    const packageName = contextPath[0];
    if (!packageName) {
        return `js:${kind}:${name}`;
    }
    if (contextPath.length === 1) {
        // node is a direct module of the package
        return `js:${kind}:${packageName}/${name}`;
    }
    const modulePath = contextPath[1];
    const moduleId = `${packageName}/${modulePath}`;
    if (contextPath.length === 2) {
        return `js:${kind}:${moduleId}#${name}`;
    }
    const memberPath = [...contextPath.slice(2), name].join(".");
    return `js:${kind}:${moduleId}#${memberPath}`;
}

function textFromComment(comment) {
    if (!comment) {
        return undefined;
    }
    if (Array.isArray(comment.summary)) {
        const text = stripSectionMarkers(contentText(comment.summary));
        if (text) {
            return text;
        }
    }
    if (Array.isArray(comment.blockTags)) {
        const descTag = comment.blockTags.find((tag) => tag.tag === "@description");
        if (descTag) {
            const text = contentText(descTag.content);
            return text ? stripSectionMarkers(text) : undefined;
        }
    }
    return undefined;
}

function typeToString(type) {
    if (!type) {
        return "unknown";
    }
    if (typeof type === "string") {
        return type;
    }
    if (type.type === "intrinsic") {
        return type.name;
    }
    if (type.type === "reference") {
        if (type.name) {
            return type.name;
        }
        if (type.target?.qualifiedName) {
            return type.target.qualifiedName;
        }
    }
    if (type.type === "array") {
        return `${typeToString(type.elementType)}[]`;
    }
    if (type.type === "union") {
        return type.types.map(typeToString).join(" | ");
    }
    if (type.type === "intersection") {
        return type.types.map(typeToString).join(" & ");
    }
    if (type.type === "tuple") {
        return `[${type.elements.map(typeToString).join(", ")}]`;
    }
    if (type.type === "literal") {
        return JSON.stringify(type.value);
    }
    if (type.type === "reflection") {
        const sig = type.declaration?.signatures?.[0];
        if (sig) {
            const params = (sig.parameters || []).map((p) => `${p.name}: ${typeToString(p.type)}`).join(", ");
            const ret = typeToString(sig.type);
            return `(${params}) => ${ret}`;
        }
        return "object";
    }
    if (type.name) {
        return type.name;
    }
    return type.type || "unknown";
}

function typeRef(type) {
    if (!type) {
        return undefined;
    }
    return { name: typeToString(type) };
}

const repoRoot = getRepoRoot();

function sourceLocation(sources) {
    if (!sources || !sources.length) {
        return undefined;
    }
    const first = sources[0];
    const file = normalizeSourceFile(first.fileName, repoRoot);
    if (!file) {
        return undefined;
    }
    return compact({
        file,
        line: first.line,
        url: first.url,
    });
}

function resolveKind(node) {
    if (!node || typeof node.kind !== "number") {
        return "type";
    }
    return KIND_MAP.get(node.kind) || "type";
}

function resolveKindName(node) {
    if (!node || typeof node.kind !== "number") {
        return undefined;
    }
    return KIND_NAME_MAP.get(node.kind);
}

function examplesFromBlockTags(blockTags) {
    if (!blockTags || !blockTags.length) {
        return undefined;
    }
    const exampleTags = blockTags.filter((tag) => tag.tag === "@example");
    if (!exampleTags.length) {
        return undefined;
    }
    return exampleTags.map((tag) => {
        const raw = contentText(tag.content);
        const fenceMatch = raw.match(/^\s*```(\w*)\n([\s\S]*?)\n?```\s*$/);
        if (fenceMatch) {
            return compact({ lang: fenceMatch[1] || undefined, content: fenceMatch[2] });
        }
        return { content: raw.trim() };
    });
}

function lifecycleFromComment(comment) {
    const deprecatedTag = comment?.blockTags?.find((tag) => tag.tag === "@deprecated");
    if (!deprecatedTag) {
        return undefined;
    }
    return deprecatedLifecycle(contentText(deprecatedTag.content));
}

function signatureFromNode(signature, typeRefFn = typeRef) {
    const parameters = (signature.parameters || []).map((param) =>
        compact({
            name: param.name,
            description: textFromComment(param.comment),
            type: typeRefFn(param.type),
            optional: param.flags?.isOptional,
            default: param.defaultValue,
        }),
    );

    let throws;
    const blockTags = signature.comment?.blockTags || [];
    const throwTags = blockTags.filter((tag) => tag.tag === "@throws");
    if (throwTags.length) {
        throws = throwTags.map((tag) => ({
            name: contentText(tag.content) || "Error",
        }));
    }

    let returns = typeRefFn(signature.type);
    const returnsTag = blockTags.find((tag) => tag.tag === "@returns");
    const returnsText = contentText(returnsTag?.content).trim() || undefined;
    if (returns?.name === "object" && signature.type?.type === "reflection") {
        if (returnsText) {
            returns = { name: returnsText };
        }
    } else if (returnsText && returns) {
        returns = { ...returns, description: returnsText };
    }

    return compact({
        label: signature.name,
        parameters: parameters.length ? parameters : undefined,
        returns,
        throws,
    });
}

export class TypeDocNormalizer extends Normalizer {
    normalize(payload) {
        if (!payload || !Array.isArray(payload.children)) {
            throw new Error("Invalid TypeDoc payload");
        }

        const typedocIdMap = new Map();
        const preVisit = (node, contextPath = []) => {
            const kind = resolveKind(node);
            typedocIdMap.set(node.id, docId(node, kind, contextPath));
            if (Array.isArray(node.children)) {
                const childContextPath = [...contextPath, node.name];
                for (const child of node.children) {
                    preVisit(child, childContextPath);
                }
            }
        };
        const rootContextPath = [payload.name || "project"];
        for (const child of payload.children) {
            preVisit(child, rootContextPath);
        }

        const resolveTypeRef = (type) => {
            if (!type) return undefined;
            const base = typeRef(type);
            if (!base) return undefined;
            if (type.type === "reference") {
                const numericId = typeof type.target === "number" ? type.target : type.id;
                if (numericId != null) {
                    const canonicalId = typedocIdMap.get(numericId);
                    if (canonicalId) {
                        return { ...base, link: canonicalId };
                    }
                }
            }
            return base;
        };

        const nodes = [];
        const roots = [];

        const visit = (node, contextPath = []) => {
            const kind = resolveKind(node);
            const id = docId(node, kind, contextPath);
            const description = textFromComment(node.comment) || textFromComment(node.signatures?.[0]?.comment);
            const lifecycle = lifecycleFromComment(node.comment) || lifecycleFromComment(node.signatures?.[0]?.comment);
            const source = sourceLocation(node.sources);

            const nodeExamples = examplesFromBlockTags(node.comment?.blockTags) || [];
            const sigExamples = Array.isArray(node.signatures)
                ? node.signatures.flatMap((sig) => examplesFromBlockTags(sig.comment?.blockTags) || [])
                : [];
            const allExamples = [...nodeExamples, ...sigExamples];

            let typeDefinition;
            let nodeMembers;
            if (kind === "type" && node.type) {
                if (node.type.type === "reflection" && node.type.declaration?.children?.length) {
                    nodeMembers = node.type.declaration.children.map((prop) =>
                        compact({
                            name: prop.name,
                            kind: "property",
                            type: resolveTypeRef(prop.type),
                            description: textFromComment(prop.comment),
                        }),
                    );
                } else {
                    const typeName = typeToString(node.type);
                    if (typeName && typeName !== "unknown") {
                        typeDefinition = { name: typeName };
                    }
                }
            }

            let propertyType;
            if ((kind === "property" || kind === "method") && node.type) {
                propertyType = resolveTypeRef(node.type);
            }

            const docNode = compact({
                id,
                kind,
                name: node.name,
                description,
                lifecycle,
                children: [],
                signatures: Array.isArray(node.signatures)
                    ? node.signatures.map((sig) => signatureFromNode(sig, resolveTypeRef))
                    : undefined,
                members: nodeMembers,
                typeDefinition,
                propertyType,
                examples: allExamples.length ? allExamples : undefined,
                source,
                extensions: {
                    typedoc: {
                        id: node.id,
                        kind: resolveKindName(node),
                        variant: node.variant,
                        flags: node.flags,
                    },
                },
            });

            nodes.push(docNode);

            if (Array.isArray(node.children)) {
                const childContextPath = [...contextPath, node.name];
                for (const child of node.children) {
                    const childKind = resolveKind(child);
                    const childId = docId(child, childKind, childContextPath);
                    if (ALLOWED_KINDS.has(childKind)) {
                        docNode.children.push(childId);
                        visit(child, childContextPath);
                    }
                }
            }

            if (!docNode.children.length) {
                delete docNode.children;
            }
        };

        for (const child of payload.children) {
            const kind = resolveKind(child);
            if (ALLOWED_KINDS.has(kind)) {
                const id = docId(child, kind, rootContextPath);
                roots.push(id);
                visit(child, rootContextPath);
            }
        }

        return {
            schemaVersion: "1.0",
            source: "typedoc",
            meta: {
                title: payload.name || "TypeDoc",
                version: payload.packageVersion,
            },
            nodes,
            roots,
        };
    }
}
