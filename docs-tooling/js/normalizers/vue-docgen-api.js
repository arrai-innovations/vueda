/**
 * Normalize vue-docgen-api JSON output into the canonical schema.
 */

import path from "node:path";

import { Normalizer } from "../core.js";
import { compact } from "../utils/compact.js";

function toTypeRef(type) {
  if (!type) {
    return null;
  }
  if (typeof type === "string") {
    return { name: type };
  }
  if (typeof type === "object" && type.name) {
    return { name: type.name };
  }
  return { name: String(type) };
}

function propDefault(value) {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object" && "value" in value) {
    return String(value.value);
  }
  return String(value);
}

function componentId(filePath, displayName) {
  return `vue:component:${filePath}#${displayName}`;
}

function slotId(componentIdValue, slotName) {
  return `${componentIdValue}:slot:${slotName}`;
}

function eventId(componentIdValue, eventName) {
  return `${componentIdValue}:event:${eventName}`;
}

export class VueDocgenNormalizer extends Normalizer {
  normalize(payload) {
    if (!payload || !Array.isArray(payload.files)) {
      throw new Error("Invalid vue-docgen payload");
    }

    const nodes = [];
    const roots = [];

    for (const file of payload.files) {
      const filePath = file.filePath;
      for (const component of file.components || []) {
        const displayName =
          component.displayName ||
          component.exportName ||
          path.basename(filePath, path.extname(filePath));
        const id = componentId(filePath, displayName);

        const node = compact({
          id,
          kind: "component",
          name: displayName,
          description: component.description || undefined,
          members: [],
          children: [],
          source: { file: filePath },
          extensions: {
            vueDocgen: {
              exportName: component.exportName,
              tags: component.tags || undefined,
              sourceFiles: component.sourceFiles || undefined,
            },
          },
        });

        for (const prop of component.props || []) {
          const typeRef = toTypeRef(prop.type);
          node.members.push(
            compact({
              name: prop.name,
              kind: "prop",
              description: prop.description || undefined,
              type: typeRef || undefined,
              required: prop.required ?? undefined,
              default: propDefault(prop.defaultValue) || undefined,
              readonly: undefined,
            })
          );
        }

        for (const slot of component.slots || []) {
          const slotNodeId = slotId(id, slot.name);
          const slotNode = compact({
            id: slotNodeId,
            kind: "slot",
            name: slot.name,
            description: undefined,
            signatures: [
              compact({
                label: slot.scoped ? "scoped" : "slot",
                parameters: (slot.bindings || []).map((binding) => ({
                  name: binding.name,
                })),
              }),
            ],
            source: { file: filePath },
            extensions: {
              vueDocgen: {
                scoped: slot.scoped,
                bindings: slot.bindings || [],
              },
            },
          });
          node.children.push(slotNodeId);
          nodes.push(slotNode);
        }

        for (const event of component.events || []) {
          const eventNodeId = eventId(id, event.name);
          const eventNode = compact({
            id: eventNodeId,
            kind: "event",
            name: event.name,
            description: event.description || undefined,
            source: { file: filePath },
            extensions: { vueDocgen: { ...event } },
          });
          node.children.push(eventNodeId);
          nodes.push(eventNode);
        }

        nodes.push(node);
        roots.push(id);
      }
    }

    return {
      schemaVersion: "1.0",
      source: "vue-docgen",
      meta: {
        title: "Vue Components",
        sourcePath: payload.sourceDir,
      },
      nodes,
      roots,
    };
  }
}
