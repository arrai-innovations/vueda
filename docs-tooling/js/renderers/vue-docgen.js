import { buildCanonicalIndex } from "../utils/index-canonical.js";
import {
  formatBindings,
  formatMembers,
  formatSource,
  linkToPath,
  normalizeTitle,
  escapeText,
  renderCodeInline,
  renderFrontmatter,
  renderHeading,
  renderTable,
  slugify,
} from "./markdown.js";

function componentPath(node) {
  return `vue/components/${slugify(node.name)}.md`;
}

function slotsPath(node) {
  return `vue/components/${slugify(node.name)}/slots.md`;
}

function eventsPath(node) {
  return `vue/components/${slugify(node.name)}/events.md`;
}

function renderProps(node) {
  const rows = formatMembers(node.members || [], "prop");
  const table = renderTable(["Name", "Type", "Required", "Default", "Description"], rows);
  if (!table) {
    return "";
  }
  return [renderHeading(2, "Props"), "", table, ""].join("\n");
}

function renderSlots(node, index, filePath, pathMap) {
  const slots = (index.childrenOf.get(node.id) || []).filter((child) => child.kind === "slot");
  if (!slots.length) {
    return "";
  }
  const lines = [renderHeading(2, "Slots"), ""];
  for (const slot of slots) {
    const target = pathMap.get(`${node.id}:slots`);
    const heading = target
      ? linkToPath(renderCodeInline(slot.name), target, filePath)
      : renderCodeInline(slot.name);
    lines.push(renderHeading(3, heading));
    const scoped = slot.extensions?.vueDocgen?.scoped;
    lines.push("", scoped ? "Scoped slot." : "Slot.", "");
    const signature = slot.signatures?.[0];
    const bindings = formatBindings(signature?.parameters || []);
    const table = renderTable(["Name", "Description"], bindings);
    if (table) {
      lines.push(renderHeading(4, "Bindings"), "", table, "");
    }
  }
  return lines.join("\n");
}

function renderEvents(node, index, filePath, pathMap) {
  const events = (index.childrenOf.get(node.id) || []).filter((child) => child.kind === "event");
  if (!events.length) {
    return "";
  }
  const lines = [renderHeading(2, "Events"), ""];
  for (const event of events) {
    const target = pathMap.get(`${node.id}:events`);
    const heading = target
      ? linkToPath(renderCodeInline(event.name), target, filePath)
      : renderCodeInline(event.name);
    lines.push(renderHeading(3, heading));
    if (event.description) {
      lines.push("", event.description, "");
    } else {
      lines.push("");
    }
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

export function renderVueDocgenNode(node, index, filePath) {
  const frontmatter = renderFrontmatter({
    id: node.id,
    kind: node.kind,
    source: "vue-docgen",
  });

  const lines = [];
  lines.push(frontmatter);
  lines.push(renderHeading(1, normalizeTitle(node.name)), "");

  if (node.description) {
    lines.push(renderHeading(2, "Overview"), "", escapeText(node.description), "");
  }

  const propsBlock = renderProps(node);
  if (propsBlock) {
    lines.push(propsBlock);
  }

  const slotsBlock = renderSlots(node, index, filePath, index.pathMap);
  if (slotsBlock) {
    lines.push(slotsBlock);
  }

  const eventsBlock = renderEvents(node, index, filePath, index.pathMap);
  if (eventsBlock) {
    lines.push(eventsBlock);
  }

  const sourceBlock = renderSource(node);
  if (sourceBlock) {
    lines.push(sourceBlock);
  }

  return { filePath, content: lines.join("\n").trimEnd() + "\n" };
}

function renderSlotsPage(node, index) {
  const slots = (index.childrenOf.get(node.id) || []).filter((child) => child.kind === "slot");
  if (!slots.length) {
    return null;
  }
  const lines = [];
  lines.push(
    renderFrontmatter({ id: `${node.id}:slots`, kind: "slots", source: "vue-docgen" }),
    renderHeading(1, `${normalizeTitle(node.name)} Slots`),
    ""
  );

  for (const slot of slots) {
    lines.push(renderHeading(2, renderCodeInline(slot.name)));
    const scoped = slot.extensions?.vueDocgen?.scoped;
    lines.push("", scoped ? "Scoped slot." : "Slot.", "");
    const signature = slot.signatures?.[0];
    const bindings = formatBindings(signature?.parameters || []);
    const table = renderTable(["Name", "Description"], bindings);
    if (table) {
      lines.push(renderHeading(3, "Bindings"), "", table, "");
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}

function renderEventsPage(node, index) {
  const events = (index.childrenOf.get(node.id) || []).filter((child) => child.kind === "event");
  if (!events.length) {
    return null;
  }
  const lines = [];
  lines.push(
    renderFrontmatter({ id: `${node.id}:events`, kind: "events", source: "vue-docgen" }),
    renderHeading(1, `${normalizeTitle(node.name)} Events`),
    ""
  );

  for (const event of events) {
    lines.push(renderHeading(2, renderCodeInline(event.name)));
    if (event.description) {
      lines.push("", escapeText(event.description), "");
    } else {
      lines.push("");
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function renderVueDocgenBundle(bundle) {
  const index = buildCanonicalIndex(bundle);
  const outputs = new Map();
  const pathMap = new Map();
  for (const node of bundle.nodes) {
    if (node.kind === "component") {
      pathMap.set(node.id, componentPath(node));
      pathMap.set(`${node.id}:slots`, slotsPath(node));
      pathMap.set(`${node.id}:events`, eventsPath(node));
    }
  }
  index.pathMap = pathMap;
  for (const node of bundle.nodes) {
    if (node.kind !== "component") {
      continue;
    }
    const filePath = pathMap.get(node.id);
    const { content } = renderVueDocgenNode(node, index, filePath);
    outputs.set(filePath, content);

    const slotsPage = renderSlotsPage(node, index);
    if (slotsPage) {
      outputs.set(slotsPath(node), slotsPage);
    }

    const eventsPage = renderEventsPage(node, index);
    if (eventsPage) {
      outputs.set(eventsPath(node), eventsPage);
    }
  }
  return outputs;
}
