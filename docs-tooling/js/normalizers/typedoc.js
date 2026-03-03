/**
 * Normalize TypeDoc JSON output into the canonical schema.
 */
import { Normalizer } from "../core.js";
import { compact } from "../utils/compact.js";
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
]);

function docId(node, kind, contextPath = []) {
    const name = node.name || "anonymous";
    const pathPart = contextPath.length ? `${contextPath.join(".")}.` : "";
    return `js:${kind}:${pathPart}${name}`;
}

function textFromComment(comment) {
    if (!comment) {
        return undefined;
    }
    if (Array.isArray(comment.summary)) {
        const text = comment.summary.map((part) => part.text).join("");
        if (text) {
            return text;
        }
    }
    if (Array.isArray(comment.blockTags)) {
        const descTag = comment.blockTags.find((tag) => tag.tag === "@description");
        if (descTag) {
            return descTag.content?.map((part) => part.text).join("") || undefined;
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
        const raw = tag.content?.map((part) => part.text).join("") || "";
        const fenceMatch = raw.match(/^\s*```(\w*)\n([\s\S]*?)\n?```\s*$/);
        if (fenceMatch) {
            return compact({ lang: fenceMatch[1] || undefined, content: fenceMatch[2] });
        }
        return { content: raw.trim() };
    });
}

function signatureFromNode(signature) {
    const parameters = (signature.parameters || []).map((param) =>
        compact({
            name: param.name,
            description: textFromComment(param.comment),
            type: typeRef(param.type),
            optional: param.flags?.isOptional,
            default: param.defaultValue,
        }),
    );

    let throws;
    const blockTags = signature.comment?.blockTags || [];
    const throwTags = blockTags.filter((tag) => tag.tag === "@throws");
    if (throwTags.length) {
        throws = throwTags.map((tag) => ({
            name: tag.content?.map((part) => part.text).join("") || "Error",
        }));
    }

    let returns = typeRef(signature.type);
    const returnsTag = blockTags.find((tag) => tag.tag === "@returns");
    const returnsText =
        returnsTag?.content
            ?.map((part) => part.text)
            .join("")
            .trim() || undefined;
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

        const nodes = [];
        const roots = [];

        const visit = (node, contextPath = []) => {
            const kind = resolveKind(node);
            const id = docId(node, kind, contextPath);
            const description = textFromComment(node.comment) || textFromComment(node.signatures?.[0]?.comment);
            const source = sourceLocation(node.sources);

            const nodeExamples = examplesFromBlockTags(node.comment?.blockTags) || [];
            const sigExamples = Array.isArray(node.signatures)
                ? node.signatures.flatMap((sig) => examplesFromBlockTags(sig.comment?.blockTags) || [])
                : [];
            const allExamples = [...nodeExamples, ...sigExamples];

            const docNode = compact({
                id,
                kind,
                name: node.name,
                description,
                children: [],
                signatures: Array.isArray(node.signatures) ? node.signatures.map(signatureFromNode) : undefined,
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
                for (const child of node.children) {
                    const childKind = resolveKind(child);
                    const childId = docId(child, childKind, [...contextPath, node.name]);
                    if (
                        [
                            "module",
                            "namespace",
                            "class",
                            "interface",
                            "function",
                            "method",
                            "property",
                            "enum",
                            "type",
                        ].includes(childKind)
                    ) {
                        docNode.children.push(childId);
                        visit(child, [...contextPath, node.name]);
                    }
                }
            }

            if (!docNode.children.length) {
                delete docNode.children;
            }
        };

        for (const child of payload.children) {
            const kind = resolveKind(child);
            if (
                [
                    "module",
                    "namespace",
                    "class",
                    "interface",
                    "function",
                    "method",
                    "property",
                    "enum",
                    "type",
                ].includes(kind)
            ) {
                const id = docId(child, kind, [payload.name || "project"]);
                roots.push(id);
                visit(child, [payload.name || "project"]);
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
