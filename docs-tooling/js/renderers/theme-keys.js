/**
 * Render the canonical theme-keys bundle to Markdown pages under `theming/`.
 *
 * Output layout:
 *   theming/keys.md                              global index (one section per family)
 *   theming/keys/family/<family-slug>.md         per-family index page
 *   theming/keys/<Component>.md                  per-component page (underscore preserved for primitives)
 *
 * Each per-component page contains a summary table of its slots plus a detail
 * block per slot (anchor, description, default classes, callback source,
 * composes chips, source footer). The page frontmatter exposes `member_ids`
 * for the component itself and every slot so `{@api theme-key:<Component>}` and
 * `{@api theme-key:<Component>.<slot>}` references resolve here.
 */
import { themeKeySlotAnchor } from "../utils/reference-index.js";
import { renderCodeInline, renderFrontmatter, renderHeading, renderTable, slugify } from "./markdown.js";

const UNGROUPED = "Ungrouped";

function familySlug(name) {
    return slugify(String(name || "").toLowerCase());
}

function componentMemberId(componentName) {
    return `theme-key:${componentName}`;
}

function componentPagePath(componentName) {
    return `theming/keys/${componentName}.md`;
}

function familyPagePath(familyName) {
    return `theming/keys/family/${familySlug(familyName)}.md`;
}

function firstSentence(text) {
    if (!text) {
        return "";
    }
    const trimmed = String(text).trim();
    const firstLine = trimmed.split(/\r?\n/, 1)[0] || "";
    return firstLine.trim();
}

function formatSourceLine(source) {
    if (!source?.file) {
        return null;
    }
    if (source.line) {
        return `${source.file}:${source.line}`;
    }
    return source.file;
}

function renderComposesChips(composes) {
    if (!composes || composes.length === 0) {
        return "";
    }
    return composes.map((ref) => renderCodeInline(ref)).join(" ");
}

function renderDefaultClasses(defaultClasses) {
    if (!defaultClasses || defaultClasses.length === 0) {
        return null;
    }
    if (defaultClasses.length === 1) {
        return renderCodeInline(defaultClasses[0]);
    }
    const lines = defaultClasses.join("\n");
    return ["```text", lines, "```"].join("\n");
}

function summariseDefaults(defaultClasses, valueShape) {
    if (valueShape === "callback") {
        return "callback";
    }
    if (!defaultClasses || defaultClasses.length === 0) {
        return "";
    }
    if (defaultClasses.length === 1) {
        return renderCodeInline(defaultClasses[0]);
    }
    return `${defaultClasses.length} classes`;
}

function renderSlotDetail(component, slot, lines) {
    lines.push(`<a id="${themeKeySlotAnchor(component.name, slot.name)}"></a>`);
    lines.push("");
    lines.push(renderHeading(2, slot.name));
    lines.push("");

    if (slot.description) {
        lines.push(`> ${slot.description}`);
        lines.push("");
    }

    if (slot.defaultClasses && slot.defaultClasses.length) {
        lines.push("Default classes:");
        lines.push("");
        const rendered = renderDefaultClasses(slot.defaultClasses);
        if (rendered) {
            lines.push(rendered);
            lines.push("");
        }
    }

    if (slot.callbackSource) {
        lines.push("Callback:");
        lines.push("");
        lines.push("```javascript");
        lines.push(slot.callbackSource);
        lines.push("```");
        lines.push("");
    }

    if (slot.composes && slot.composes.length) {
        lines.push("Composes: " + renderComposesChips(slot.composes));
        lines.push("");
    }

    const srcLine = formatSourceLine(slot.source);
    if (srcLine) {
        lines.push(`Source: ${renderCodeInline(srcLine)}`);
        lines.push("");
    }
}

function collectComponentMemberIds(component) {
    const ids = [componentMemberId(component.name)];
    for (const slot of component.slots) {
        ids.push(slot.id);
    }
    return ids;
}

function renderComponentPage(component, family, options) {
    const componentNames = options?.componentNames;
    const hasVueDocgenComponent = component.kind === "key" && componentNames && componentNames.has(component.name);

    const frontmatter = {
        title: component.name,
        id: `theming:keys:${component.name}`,
        member_ids: collectComponentMemberIds(component),
        family: family.name,
        kind: component.kind,
        group: component.group || null,
    };

    const lines = [];
    lines.push(renderFrontmatter(frontmatter));
    lines.push(renderHeading(1, component.name));
    lines.push("");

    if (component.kind === "primitive") {
        lines.push("_Composition primitive, consumed by leaf keys via `composes`._");
        lines.push("");
    }

    const componentSourceLine = family.sourceFile || formatSourceLine(component.slots[0]?.source);
    if (componentSourceLine) {
        lines.push(`Source: ${renderCodeInline(componentSourceLine)}`);
        lines.push("");
    }

    if (component.description) {
        lines.push(`> ${component.description}`);
        lines.push("");
    }

    if (hasVueDocgenComponent) {
        lines.push(`Vue component: {@api vue:component:${component.name}}`);
        lines.push("");
    }

    const headers = ["Slot", "Default classes", "Description"];
    const rows = component.slots.map((slot) => [
        `[${slot.name}](#${themeKeySlotAnchor(component.name, slot.name)})`,
        summariseDefaults(slot.defaultClasses, slot.valueShape),
        slot.description || "",
    ]);
    const table = renderTable(headers, rows);
    if (table) {
        lines.push(table);
        lines.push("");
    }

    for (const slot of component.slots) {
        renderSlotDetail(component, slot, lines);
    }

    return lines.join("\n");
}

function componentSummaryRow(component) {
    const slotCount = component.slots.length;
    const description = firstSentence(component.description);
    return [`[${component.name}](../${component.name}.md)`, component.kind, String(slotCount), description];
}

function componentSummaryRowFromIndex(component) {
    // Linked from the global index at theming/keys.md → theming/keys/<Component>.md
    const slotCount = component.slots.length;
    const description = firstSentence(component.description);
    return [`[${component.name}](./keys/${component.name}.md)`, component.kind, String(slotCount), description];
}

function groupComponents(components) {
    const order = [];
    const byGroup = new Map();
    for (const component of components) {
        const groupName = component.group || UNGROUPED;
        if (!byGroup.has(groupName)) {
            byGroup.set(groupName, []);
            order.push(groupName);
        }
        byGroup.get(groupName).push(component);
    }
    return order.map((name) => ({ name, components: byGroup.get(name) }));
}

function renderFamilyIndexPage(family) {
    const slug = familySlug(family.name);
    const title = `${family.name} keys`;
    const frontmatter = {
        title,
        id: `theming:keys:family:${slug}`,
    };

    const lines = [];
    lines.push(renderFrontmatter(frontmatter));
    lines.push(renderHeading(1, title));
    lines.push("");

    if (family.sourceFile) {
        lines.push(`Source file: ${renderCodeInline(family.sourceFile)}`);
        lines.push("");
    }

    const headers = ["Component", "Kind", "Slots", "Description"];
    const grouped = groupComponents(family.components);
    const hasNamedGroups = grouped.some((g) => g.name !== UNGROUPED);

    if (hasNamedGroups) {
        for (const group of grouped) {
            lines.push(renderHeading(2, group.name));
            lines.push("");
            const rows = group.components.map(componentSummaryRow);
            const table = renderTable(headers, rows);
            if (table) {
                lines.push(table);
                lines.push("");
            }
        }
    } else {
        const rows = family.components.map(componentSummaryRow);
        const table = renderTable(headers, rows);
        if (table) {
            lines.push(table);
            lines.push("");
        }
    }

    return lines.join("\n");
}

function renderGlobalIndexPage(families) {
    const frontmatter = {
        title: "Theme keys",
        id: "theming:keys",
    };

    const lines = [];
    lines.push(renderFrontmatter(frontmatter));
    lines.push(renderHeading(1, "Theme keys"));
    lines.push("");
    lines.push(
        "Theme keys are the per-slot Tailwind class definitions shipped by `@vueda/theme/vueda-tailwind`. Underscore-prefixed entries are composition primitives consumed by leaf keys via `composes`.",
    );
    lines.push("");

    const headers = ["Component", "Kind", "Slots", "Description"];

    for (const family of families) {
        const slug = familySlug(family.name);
        lines.push(renderHeading(2, `[${family.name}](./keys/family/${slug}.md)`));
        lines.push("");
        const rows = family.components.map(componentSummaryRowFromIndex);
        const table = renderTable(headers, rows);
        if (table) {
            lines.push(table);
            lines.push("");
        }
    }

    return lines.join("\n");
}

export function renderThemeKeysBundle(bundle, options = {}) {
    const outputs = new Map();
    if (!bundle || bundle.source !== "theme-keys") {
        return outputs;
    }

    const families = bundle.families || [];

    for (const family of families) {
        outputs.set(familyPagePath(family.name), renderFamilyIndexPage(family));
        for (const component of family.components) {
            outputs.set(componentPagePath(component.name), renderComponentPage(component, family, options));
        }
    }

    outputs.set("theming/keys.md", renderGlobalIndexPage(families));
    return outputs;
}
