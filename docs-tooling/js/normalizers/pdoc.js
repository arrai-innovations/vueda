/**
 * Normalize pdoc JSON output into the canonical schema.
 */

import { Normalizer } from "../core.js";
import { compact } from "../utils/compact.js";

const KIND_MAP = {
  module: "module",
  class: "class",
  function: "function",
  method: "method",
  variable: "property",
  attribute: "property",
};

function nodeId(fullname) {
  return `pdoc:${fullname}`;
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
      default:
        param.default === null || param.default === undefined ? undefined : String(param.default),
    })
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
      if (!doc.fullname) {
        continue;
      }
      byFullname.set(doc.fullname, doc);
    }

    for (const doc of payload.docs) {
      if (!doc.fullname) {
        continue;
      }

      const kind = KIND_MAP[doc.kind] || "type";
      const id = nodeId(doc.fullname);
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
          ? {
              file: doc.source_file,
              line: doc.source_lines?.start,
            }
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
      const id = nodeId(doc.fullname);
      const node = nodeIndex.get(id);
      if (!node) {
        continue;
      }

      const children = [];
      if (doc.members) {
        for (const member of doc.members) {
          if (byFullname.has(member)) {
            children.push(nodeId(member));
          }
        }
      }
      if (doc.submodules) {
        for (const submodule of doc.submodules) {
          if (byFullname.has(submodule)) {
            children.push(nodeId(submodule));
          }
        }
      }
      if (children.length) {
        node.children = children;
      }
    }

    for (const name of payload.module_names || []) {
      const rootId = nodeId(name);
      if (nodeIndex.has(rootId)) {
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
