/**
 * Render the canonical theme-keys bundle to Markdown pages.
 *
 * Output layout:
 *   theming/keys.md                    -- index page (components + meta keys)
 *   theming/keys/<EntryName>.md        -- one page per entry
 */
import { renderCodeInline, renderFrontmatter, renderHeading } from "./markdown.js";

function entryPath(name) {
    return `theming/keys/${name}.md`;
}

function entryId(name) {
    return `theme-key:${name}`;
}

function formatSourceLine(source) {
    if (!source?.file) return "";
    if (source.line) return `${source.file}:${source.line}`;
    return source.file;
}

function renderComposesList(composes, options) {
    const linkedTargets = options?.linkedThemeEntries || new Set();
    return composes.map((ref) => {
        const idx = ref.indexOf(".");
        if (idx <= 0) {
            return `- ${renderCodeInline(ref)}`;
        }
        const target = ref.slice(0, idx);
        const slot = ref.slice(idx + 1);
        const apiRef = linkedTargets.has(target) ? `{@api ${entryId(target)}}` : renderCodeInline(target);
        return `- ${apiRef} _(${slot})_`;
    });
}

function renderEntryPage(entry, options) {
    const allEntryNames = options?.linkedThemeEntries || new Set();
    const linkedComponent = options?.componentNames?.has(entry.name) ? entry.name : null;

    const frontmatter = {
        title: entry.name,
        id: entryId(entry.name),
    };

    const lines = [];
    lines.push(renderFrontmatter(frontmatter));
    lines.push(renderHeading(1, entry.name));
    lines.push("");

    if (entry.isMetaKey) {
        lines.push("_Meta key — composition primitive._");
        lines.push("");
    }

    if (linkedComponent) {
        lines.push(`Vue component: {@api vue:component:${linkedComponent}}`);
        lines.push("");
    }

    if (entry.description) {
        lines.push(entry.description, "");
    }

    if (entry.slots.length) {
        lines.push(renderHeading(2, "Slots"));
        lines.push("");
        for (const slot of entry.slots) {
            lines.push(renderHeading(3, renderCodeInline(slot.name)));
            lines.push("");
            if (slot.isFunction) {
                lines.push("Variant-driven; see source.");
                lines.push("");
                continue;
            }
            if (slot.rawClasses.length) {
                lines.push("Classes:");
                lines.push("");
                for (const cls of slot.rawClasses) {
                    lines.push(`- ${renderCodeInline(cls)}`);
                }
                lines.push("");
            }
            if (slot.composes.length) {
                lines.push("Composes:");
                lines.push("");
                for (const line of renderComposesList(slot.composes, { linkedThemeEntries: allEntryNames })) {
                    lines.push(line);
                }
                lines.push("");
            }
        }
    }

    if (entry.composedBy && entry.composedBy.length) {
        lines.push(renderHeading(2, "Composed by"));
        lines.push("");
        for (const ref of entry.composedBy) {
            const consumerLink = allEntryNames.has(ref.consumer)
                ? `{@api ${entryId(ref.consumer)}}`
                : renderCodeInline(ref.consumer);
            lines.push(`- ${consumerLink}.${ref.slot}`);
        }
        lines.push("");
    }

    if (entry.source?.file) {
        lines.push(renderHeading(2, "Source"));
        lines.push("");
        lines.push(renderCodeInline(formatSourceLine(entry.source)));
        lines.push("");
    }

    return lines.join("\n");
}

function renderIndexPage(entries) {
    const components = entries.filter((e) => !e.isMetaKey);
    const metaKeys = entries.filter((e) => e.isMetaKey);

    const frontmatter = {
        title: "Theme keys",
        id: "theming:keys",
    };

    const lines = [];
    lines.push(renderFrontmatter(frontmatter));
    lines.push(renderHeading(1, "Theme keys"));
    lines.push("");
    lines.push(
        "Theme entries shipped by `@vueda/theme/vueda-tailwind`. Each entry exposes one or more slots; meta keys are composition primitives consumed by leaf entries via `composes`.",
    );
    lines.push("");

    if (components.length) {
        lines.push(renderHeading(2, "Components"));
        lines.push("");
        for (const entry of components) {
            lines.push(`- [${entry.name}](./keys/${entry.name}.md)`);
        }
        lines.push("");
    }

    if (metaKeys.length) {
        lines.push(renderHeading(2, "Meta keys"));
        lines.push("");
        for (const entry of metaKeys) {
            lines.push(`- [${entry.name}](./keys/${entry.name}.md)`);
        }
        lines.push("");
    }

    return lines.join("\n");
}

export function renderThemeKeysBundle(bundle, options = {}) {
    const outputs = new Map();
    if (!bundle || bundle.kind !== "theme-keys") {
        return outputs;
    }

    const entries = bundle.entries || [];
    const linkedThemeEntries = new Set(entries.map((e) => e.name));
    const componentNames = options.componentNames || new Set();

    for (const entry of entries) {
        outputs.set(entryPath(entry.name), renderEntryPage(entry, { linkedThemeEntries, componentNames }));
    }

    outputs.set("theming/keys.md", renderIndexPage(entries));

    return outputs;
}
