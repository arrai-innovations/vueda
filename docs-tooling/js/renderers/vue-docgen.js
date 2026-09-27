import { buildCanonicalIndex } from "../utils/index-canonical.js";
import { buildVueDocgenPathMap, vueDocgenEventsPath, vueDocgenSlotsPath } from "../utils/path-map.js";
import { vueMemberAnchor } from "../utils/reference-index.js";
import {
    escapeText,
    formatBindings,
    formatMembers,
    formatSource,
    linkToPath,
    normalizeTitle,
    renderCodeInline,
    renderFrontmatter,
    renderHeading,
    renderLifecycle,
    renderTable,
} from "./markdown.js";

/**
 * Wrap a table's name cell in the anchor its member id resolves to.
 */
function anchoredName(anchor, name) {
    return `<span id="${anchor}">${name}</span>`;
}

function componentProps(node) {
    return (node.members || []).filter((member) => member.kind === "prop");
}

function renderProps(node) {
    const props = componentProps(node);
    const rows = formatMembers(props, "prop").map((row, position) => [
        anchoredName(vueMemberAnchor("prop", props[position].name), row[0]),
        ...row.slice(1),
    ]);
    const table = renderTable(["Name", "Type", "Required", "Default", "Description"], rows);
    if (!table) {
        return "";
    }
    return [renderHeading(2, "Props"), "", table, ""].join("\n");
}

function renderBindings(slot) {
    const bindings = slot.signatures?.[0]?.parameters || [];
    const rows = formatBindings(bindings).map((row, position) => [
        anchoredName(vueMemberAnchor("slot", slot.name, bindings[position].name), row[0]),
        ...row.slice(1),
    ]);
    return renderTable(["Name", "Description"], rows);
}

function slotHeading(slot) {
    return `${renderCodeInline(slot.name)} {#${vueMemberAnchor("slot", slot.name)}}`;
}

function eventHeading(event) {
    return `${renderCodeInline(event.name)} {#${vueMemberAnchor("event", event.name)}}`;
}

/**
 * Return the ids of slots and their bindings, one per anchor the slot section carries.
 */
function slotMemberIds(slots) {
    return slots.flatMap((slot) => [
        slot.id,
        ...(slot.signatures?.[0]?.parameters || []).map((binding) => `${slot.id}.${binding.name}`),
    ]);
}

/**
 * Return the member ids the component page carries: its props, and its slots and events unless
 * they have their own page.
 */
function componentMemberIds(node, index) {
    const children = index.childrenOf.get(node.id) || [];
    const ids = componentProps(node).map((prop) => `${node.id}:prop:${prop.name}`);
    if (!index.pathMap?.has(`${node.id}:slots`)) {
        ids.push(...slotMemberIds(children.filter((child) => child.kind === "slot")));
    }
    if (!index.pathMap?.has(`${node.id}:events`)) {
        ids.push(...children.filter((child) => child.kind === "event").map((event) => event.id));
    }
    return ids;
}

function renderSlotFallbacks(slot) {
    const fallbacks = slot.extensions?.vueDocgen?.fallbacks;
    if (!fallbacks?.length) {
        return null;
    }
    return `Also accepted: ${fallbacks.map(renderCodeInline).join(", ")}.`;
}

function renderSlots(node, index, filePath, pathMap) {
    const slots = (index.childrenOf.get(node.id) || []).filter((child) => child.kind === "slot");
    if (!slots.length) {
        return "";
    }
    const lines = [renderHeading(2, "Slots"), ""];
    const subPagePath = pathMap.get(`${node.id}:slots`);
    if (subPagePath) {
        // Sub-page exists: compact summary table + single CTA link.
        const rows = slots.map((slot) => [
            renderCodeInline(slot.name),
            slot.extensions?.vueDocgen?.scoped ? "yes" : "",
            slot.description || "",
        ]);
        lines.push(renderTable(["Name", "Scoped", "Description"], rows), "");
        lines.push(linkToPath("Full slot reference", subPagePath, filePath), "");
    } else {
        // No sub-page: full inline detail per slot.
        for (const slot of slots) {
            lines.push(renderHeading(3, slotHeading(slot)));
            const scoped = slot.extensions?.vueDocgen?.scoped;
            lines.push("", scoped ? "Scoped slot." : "Slot.", "");
            const fallbackLine = renderSlotFallbacks(slot);
            if (fallbackLine) {
                lines.push(fallbackLine, "");
            }
            const table = renderBindings(slot);
            if (table) {
                lines.push(renderHeading(4, "Bindings"), "", table, "");
            }
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
    const subPagePath = pathMap.get(`${node.id}:events`);
    if (subPagePath) {
        // Sub-page exists: compact summary table + single CTA link.
        const rows = events.map((event) => [renderCodeInline(event.name), event.description || ""]);
        lines.push(renderTable(["Name", "Description"], rows), "");
        lines.push(linkToPath("Full event reference", subPagePath, filePath), "");
    } else {
        // No sub-page: full inline detail per event.
        for (const event of events) {
            lines.push(renderHeading(3, eventHeading(event)));
            if (event.description) {
                lines.push("", event.description, "");
            } else {
                lines.push("");
            }
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

export function renderVueDocgenNode(node, index, filePath, options = {}) {
    const memberIds = componentMemberIds(node, index);
    const frontmatter = renderFrontmatter({
        id: node.id,
        kind: node.kind,
        source: "vue-docgen",
        member_ids: memberIds.length ? memberIds : undefined,
    });

    const lines = [];
    lines.push(frontmatter);
    lines.push(renderHeading(1, normalizeTitle(node.name)), "");

    const lifecycleBlock = renderLifecycle(node.lifecycle);
    if (lifecycleBlock) {
        lines.push(lifecycleBlock, "");
    }

    if (node.description) {
        lines.push(renderHeading(2, "Overview"), "", escapeText(node.description), "");
    }

    const themeKeysIndex = options.themeKeysIndex;
    if (themeKeysIndex && themeKeysIndex.has(node.name)) {
        lines.push(`Theme entry: {@api theme-key:${node.name}}`, "");
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
        renderFrontmatter({
            id: `${node.id}:slots`,
            kind: "slots",
            source: "vue-docgen",
            member_ids: slotMemberIds(slots),
        }),
        renderHeading(1, `${normalizeTitle(node.name)} Slots`),
        "",
    );

    for (const slot of slots) {
        lines.push(renderHeading(2, slotHeading(slot)));
        if (slot.description) {
            lines.push("", escapeText(slot.description), "");
        }
        const scoped = slot.extensions?.vueDocgen?.scoped;
        lines.push("", scoped ? "Scoped slot." : "Slot.", "");
        const fallbackLine = renderSlotFallbacks(slot);
        if (fallbackLine) {
            lines.push(fallbackLine, "");
        }
        const table = renderBindings(slot);
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
        renderFrontmatter({
            id: `${node.id}:events`,
            kind: "events",
            source: "vue-docgen",
            member_ids: events.map((event) => event.id),
        }),
        renderHeading(1, `${normalizeTitle(node.name)} Events`),
        "",
    );

    for (const event of events) {
        lines.push(renderHeading(2, eventHeading(event)));
        if (event.description) {
            lines.push("", escapeText(event.description), "");
        } else {
            lines.push("");
        }
    }

    return lines.join("\n").trimEnd() + "\n";
}

const INDEX_PATH = "vue/index.md";
const GROUP_ORDER = ["views", "components", "fields", "widgets"];

function componentGroup(node) {
    const file = node.source?.file || "";
    const relative = file.startsWith("client/lib/") ? file.slice("client/lib/".length) : file;
    return relative.split("/")[0] || "other";
}

function groupTitle(group) {
    return group.charAt(0).toUpperCase() + group.slice(1);
}

function renderComponentIndex(componentNodes, pathMap) {
    const groups = new Map();
    for (const node of componentNodes) {
        const group = componentGroup(node);
        if (!groups.has(group)) {
            groups.set(group, []);
        }
        groups.get(group).push(node);
    }
    for (const nodes of groups.values()) {
        nodes.sort((a, b) => a.name.localeCompare(b.name));
    }

    const orderedKeys = [
        ...GROUP_ORDER.filter((g) => groups.has(g)),
        ...[...groups.keys()].filter((g) => !GROUP_ORDER.includes(g)).sort(),
    ];

    const lines = [
        renderFrontmatter({ id: "vue:index", kind: "index", source: "vue-docgen" }),
        renderHeading(1, "Vue Components"),
        "",
    ];

    for (const group of orderedKeys) {
        const nodes = groups.get(group);
        lines.push(renderHeading(2, groupTitle(group)), "");
        for (const node of nodes) {
            lines.push(renderHeading(3, linkToPath(renderCodeInline(node.name), pathMap.get(node.id), INDEX_PATH)));
            if (node.description) {
                lines.push("", escapeText(node.description), "");
            } else {
                lines.push("");
            }
        }
    }

    return lines.join("\n").trimEnd() + "\n";
}

const SLOTS_PAGE_COUNT_THRESHOLD = 5;
const EVENTS_PAGE_COUNT_THRESHOLD = 3;

function shouldEmitSlotsPage(slots) {
    return slots.length > SLOTS_PAGE_COUNT_THRESHOLD || slots.some((s) => s.description);
}

function shouldEmitEventsPage(events) {
    return events.length > EVENTS_PAGE_COUNT_THRESHOLD || events.some((e) => e.description);
}

export function renderVueDocgenBundle(bundle, options = {}) {
    const index = buildCanonicalIndex(bundle);
    const outputs = new Map();
    const pathMap = buildVueDocgenPathMap(bundle);
    const themeKeysIndex = options.themeKeysIndex;

    // Conditionally register sub-page paths before rendering so that
    // renderVueDocgenNode can link slot/event headings only when a sub-page exists.
    for (const node of bundle.nodes) {
        if (node.kind !== "component") {
            continue;
        }
        const children = index.childrenOf.get(node.id) || [];
        const slots = children.filter((c) => c.kind === "slot");
        const events = children.filter((c) => c.kind === "event");
        if (shouldEmitSlotsPage(slots)) {
            pathMap.set(`${node.id}:slots`, vueDocgenSlotsPath(node));
        }
        if (shouldEmitEventsPage(events)) {
            pathMap.set(`${node.id}:events`, vueDocgenEventsPath(node));
        }
    }

    index.pathMap = pathMap;
    const componentNodes = [];
    for (const node of bundle.nodes) {
        if (node.kind !== "component") {
            continue;
        }
        componentNodes.push(node);
        const filePath = pathMap.get(node.id);
        const { content } = renderVueDocgenNode(node, index, filePath, { themeKeysIndex });
        outputs.set(filePath, content);

        if (pathMap.has(`${node.id}:slots`)) {
            const slotsPage = renderSlotsPage(node, index);
            if (slotsPage) {
                outputs.set(pathMap.get(`${node.id}:slots`), slotsPage);
            }
        }

        if (pathMap.has(`${node.id}:events`)) {
            const eventsPage = renderEventsPage(node, index);
            if (eventsPage) {
                outputs.set(pathMap.get(`${node.id}:events`), eventsPage);
            }
        }
    }

    if (componentNodes.length) {
        outputs.set(INDEX_PATH, renderComponentIndex(componentNodes, pathMap));
    }

    return outputs;
}
