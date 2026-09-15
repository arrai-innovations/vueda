/**
 * Render the canonical css-tokens bundle to Markdown pages.
 *
 * Output layout:
 *   theming/tokens.md                  -- group index page
 *   theming/tokens/<group-slug>.md     -- one page per group, with per-token anchors
 */
import { cssTokenAnchor } from "../utils/reference-index.js";
import { renderCodeInline, renderFrontmatter, renderHeading, renderTable, slugify } from "./markdown.js";

function tokenMemberId(name) {
    return `css-token:${name.replace(/^--/, "")}`;
}

function groupSlug(name) {
    return slugify(name.toLowerCase().replace(/\s+/g, "-"));
}

function formatThemeMapping(mapping) {
    if (!mapping) return "";
    const utility = mapping.utility || "";
    const property = mapping.property || "";
    return `${utility}: ${property}`;
}

function renderGroupPage(group, tokens) {
    const slug = groupSlug(group.name);
    const memberIds = tokens.map((token) => tokenMemberId(token.name));

    const titleSuffix = /tokens?$/i.test(group.name) ? "" : " tokens";
    const title = `${group.name}${titleSuffix}`;
    const groupDescription = group.description || group.group_description || null;
    const frontmatter = {
        title,
        id: `theming:tokens:${slug}`,
        member_ids: memberIds,
    };

    const lines = [];
    lines.push(renderFrontmatter(frontmatter));
    lines.push(renderHeading(1, title));
    lines.push("");
    if (groupDescription) {
        lines.push(groupDescription, "");
    }

    const headers = ["Name", "Light", "Dark", "Description", "Tailwind utility"];
    const rows = tokens.map((token) => [
        renderCodeInline(token.name),
        token.variants?.light ? renderCodeInline(token.variants.light) : "",
        token.variants?.dark ? renderCodeInline(token.variants.dark) : "",
        token.description || "",
        token.themeMapping ? renderCodeInline(formatThemeMapping(token.themeMapping)) : "",
    ]);

    const table = renderTable(headers, rows);
    if (table) {
        lines.push(table, "");
    }

    // Per-token anchors so {@api css-token:<name>} references resolve to a
    // location inside the group page.
    lines.push(renderHeading(2, "Tokens"));
    lines.push("");
    for (const token of tokens) {
        const anchorId = cssTokenAnchor(token.name);
        lines.push(`<a id="${anchorId}"></a>`);
        lines.push("");
        lines.push(renderHeading(3, token.name));
        lines.push("");

        const detailHeaders = ["Field", "Value"];
        const detailRows = [];
        if (token.variants?.light) {
            detailRows.push(["Light", renderCodeInline(token.variants.light)]);
        }
        if (token.variants?.dark) {
            detailRows.push(["Dark", renderCodeInline(token.variants.dark)]);
        }
        if (token.themeMapping) {
            detailRows.push(["Tailwind utility", renderCodeInline(formatThemeMapping(token.themeMapping))]);
        }
        if (token.source?.file) {
            const sourceLabel = token.source.line ? `${token.source.file}:${token.source.line}` : token.source.file;
            detailRows.push(["Source", renderCodeInline(sourceLabel)]);
        }

        const detailTable = renderTable(detailHeaders, detailRows);
        if (detailTable) {
            lines.push(detailTable, "");
        }
        if (token.description) {
            lines.push(token.description, "");
        }
    }

    return lines.join("\n");
}

function renderIndexPage(groups) {
    const frontmatter = {
        title: "Theme tokens",
        id: "theming:tokens",
    };

    const lines = [];
    lines.push(renderFrontmatter(frontmatter));
    lines.push(renderHeading(1, "Theme tokens"));
    lines.push("");
    lines.push(
        "CSS custom properties shipped by `@vueda/theme/vueda-tailwind/base.css`. Tokens are grouped by purpose; values reflect both the light (`:root`) and dark (`.dark`) scopes.",
    );
    lines.push("");

    if (groups.length) {
        lines.push(renderHeading(2, "Groups"));
        lines.push("");
        for (const group of groups) {
            const slug = groupSlug(group.name);
            lines.push(`- [${group.name}](./tokens/${slug}.md)`);
        }
        lines.push("");
    }

    return lines.join("\n");
}

export function renderCssTokensBundle(bundle) {
    const outputs = new Map();
    if (!bundle || bundle.kind !== "css-tokens") {
        return outputs;
    }

    const tokensByGroup = new Map();
    for (const token of bundle.tokens || []) {
        const groupName = token.group || "Base";
        if (!tokensByGroup.has(groupName)) {
            tokensByGroup.set(groupName, []);
        }
        tokensByGroup.get(groupName).push(token);
    }

    // Use the bundle's `groups` order if present, otherwise insertion order.
    const orderedGroups = (
        bundle.groups && bundle.groups.length
            ? bundle.groups
            : Array.from(tokensByGroup.keys()).map((name) => ({ name, description: null }))
    ).filter((group) => tokensByGroup.has(group.name));

    for (const group of orderedGroups) {
        const tokens = tokensByGroup.get(group.name) || [];
        const slug = groupSlug(group.name);
        const filePath = `theming/tokens/${slug}.md`;
        outputs.set(filePath, renderGroupPage(group, tokens));
    }

    outputs.set("theming/tokens.md", renderIndexPage(orderedGroups));

    return outputs;
}
