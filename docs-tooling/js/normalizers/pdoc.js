/**
 * Normalize pdoc JSON output into the canonical schema.
 */
import { Normalizer } from "../core.js";
import { compact } from "../utils/compact.js";
import { getRepoRoot, normalizeSourceFile } from "../utils/source.js";

const KIND_MAP = {
    module: "module",
    class: "class",
    function: "function",
    method: "method",
    variable: "property",
    attribute: "property",
};

const repoRoot = getRepoRoot();

const MIGRATION_RE = /\.migrations(\.|$)/;
const isMigration = (fullname) => MIGRATION_RE.test(fullname);

function nodeId(kind, fullname) {
    return `py:${kind}:${fullname}`;
}

function typeRefFromAnnotation(annotation) {
    if (!annotation || annotation === "None" || annotation === "<class 'inspect._empty'>") {
        return undefined;
    }
    return { name: String(annotation) };
}

function signatureFromDetails(details, name) {
    if (!details) {
        return undefined;
    }
    const parameters = (details.parameters || []).map((param) =>
        compact({
            name: param.name,
            description: undefined,
            type: typeRefFromAnnotation(param.annotation),
            optional: false,
            default: param.default === null || param.default === undefined ? undefined : String(param.default),
        }),
    );
    return compact({
        label: name,
        parameters: parameters.length ? parameters : undefined,
        returns: typeRefFromAnnotation(details.return_annotation),
    });
}

export class PdocNormalizer extends Normalizer {
    normalize(payload) {
        if (!payload || !Array.isArray(payload.docs)) {
            throw new Error("Invalid pdoc payload");
        }

        const nodes = [];
        const roots = [];
        const byFullname = new Map();

        for (const doc of payload.docs) {
            if (!doc.fullname || isMigration(doc.fullname)) {
                continue;
            }
            byFullname.set(doc.fullname, doc);

            const kind = KIND_MAP[doc.kind] || "type";
            const id = nodeId(kind, doc.fullname);
            const signatures = [];
            const signature = signatureFromDetails(doc.signature_details, doc.name);
            if (signature) {
                signatures.push(signature);
            }

            const node = compact({
                id,
                kind,
                name: doc.name,
                description: doc.docstring || undefined,
                signatures: signatures.length ? signatures : undefined,
                source: doc.source_file
                    ? compact({
                          file: normalizeSourceFile(doc.source_file, repoRoot),
                          line: doc.source_lines?.start,
                      })
                    : undefined,
                extensions: {
                    pdoc: {
                        fullname: doc.fullname,
                        qualname: doc.qualname,
                        modulename: doc.modulename,
                        is_external: doc.is_external,
                        is_inherited: doc.is_inherited,
                        is_public: doc.is_public,
                    },
                },
            });

            nodes.push(node);
        }

        const nodeIndex = new Map(nodes.map((node) => [node.id, node]));

        for (const doc of payload.docs) {
            if (!doc.fullname) {
                continue;
            }
            const kind = KIND_MAP[doc.kind] || "type";
            const id = nodeId(kind, doc.fullname);
            const node = nodeIndex.get(id);
            if (!node) {
                continue;
            }

            const children = [];
            if (doc.members) {
                for (const member of doc.members) {
                    if (byFullname.has(member)) {
                        const memberDoc = byFullname.get(member);
                        const memberKind = KIND_MAP[memberDoc.kind] || "type";
                        children.push(nodeId(memberKind, member));
                    }
                }
            }
            if (doc.submodules) {
                for (const submodule of doc.submodules) {
                    if (byFullname.has(submodule)) {
                        const subDoc = byFullname.get(submodule);
                        const subKind = KIND_MAP[subDoc.kind] || "type";
                        children.push(nodeId(subKind, submodule));
                    }
                }
            }
            if (children.length) {
                node.children = children;
            }
        }

        // Infer direct submodule parent-child relationships from dotted names,
        // since pdoc always reports submodules: [] for all modules.
        const inferredSubmoduleChildren = new Set();
        for (const node of nodes) {
            if (node.kind !== "module") {
                continue;
            }
            const fullname = node.extensions?.pdoc?.fullname;
            if (!fullname) {
                continue;
            }
            const prefix = fullname + ".";
            for (const [otherFullname, otherDoc] of byFullname) {
                if (!otherFullname.startsWith(prefix)) {
                    continue;
                }
                const remainder = otherFullname.slice(prefix.length);
                if (remainder.includes(".")) {
                    continue; // not a direct child
                }
                const otherKind = KIND_MAP[otherDoc.kind] || "type";
                if (otherKind !== "module") {
                    continue;
                }
                const childId = nodeId(otherKind, otherFullname);
                if (!node.children) {
                    node.children = [];
                }
                if (!node.children.includes(childId)) {
                    node.children.push(childId);
                    inferredSubmoduleChildren.add(childId);
                }
            }
        }

        for (const name of payload.module_names || []) {
            const rootDoc = byFullname.get(name);
            const rootKind = rootDoc ? KIND_MAP[rootDoc.kind] || "type" : "module";
            const rootId = nodeId(rootKind, name);
            if (nodeIndex.has(rootId) && !inferredSubmoduleChildren.has(rootId)) {
                roots.push(rootId);
            }
        }

        return {
            schemaVersion: "1.0",
            source: "pdoc",
            meta: {
                title: "Python API",
            },
            nodes,
            roots,
        };
    }
}
