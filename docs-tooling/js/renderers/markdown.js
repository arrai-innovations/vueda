import { normalizePath, slugify } from "../utils/slugify.js";
import path from "node:path";

function yamlEscape(value) {
    if (value === undefined || value === null) {
        return null;
    }
    return JSON.stringify(value);
}

export function renderFrontmatter(frontmatter) {
    const entries = Object.entries(frontmatter || {}).filter(([, value]) => value !== undefined);
    if (!entries.length) {
        return "";
    }
    const lines = ["---"];
    for (const [key, value] of entries) {
        const rendered = yamlEscape(value);
        if (rendered !== null) {
            lines.push(`${key}: ${rendered}`);
        }
    }
    lines.push("---", "");
    return lines.join("\n");
}

export function renderHeading(level, text) {
    return `${"#".repeat(level)} ${text}`;
}

export function escapeText(value) {
    if (value === undefined || value === null) {
        return "";
    }
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderCodeInline(value) {
    if (!value) {
        return "";
    }

    const str = String(value);
    const matches = str.match(/`+/g);
    const maxRunLength = matches ? Math.max(...matches.map((m) => m.length)) : 0;
    const fenceLength = Math.max(1, maxRunLength + 1);
    const fence = "`".repeat(fenceLength);

    if (fenceLength === 1) {
        // Simple case: value contains no backticks, use single backtick fence.
        return `${fence}${str}${fence}`;
    }

    // When using multi-backtick fences, add a space inside to avoid ambiguity
    // if the content starts or ends with backticks.
    return `${fence} ${str} ${fence}`;
}

function escapeTableCell(value) {
    if (value === null || value === undefined) {
        return "";
    }
    return String(value).replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
}

export function renderTable(headers, rows) {
    if (!rows.length) {
        return "";
    }
    const escapedHeaders = headers.map(escapeTableCell);
    const headerLine = `| ${escapedHeaders.join(" | ")} |`;
    const separator = `| ${escapedHeaders.map(() => "---").join(" | ")} |`;
    const body = rows.map((row) => `| ${row.map(escapeTableCell).join(" | ")} |`);
    return [headerLine, separator, ...body].join("\n");
}

export function renderList(items) {
    if (!items.length) {
        return "";
    }
    return items.map((item) => `- ${item}`).join("\n");
}

export function linkToId(label, id) {
    return `[${label}](./${idToFilename(id)})`;
}

export function linkToPath(label, targetPath, fromPath) {
    if (!targetPath) {
        return label;
    }
    const fromDir = fromPath ? path.dirname(fromPath) : ".";
    const relative = path.relative(fromDir, targetPath) || path.basename(targetPath);
    const normalized = normalizePath(relative);
    return `[${label}](${normalized})`;
}

export function idToFilename(id) {
    const safe = id.replace(/[^a-zA-Z0-9-_:.]/g, "_");
    return `${safe}.md`;
}

export function formatSource(source) {
    if (!source?.file) {
        return null;
    }
    if (source.line) {
        return `${source.file}:${source.line}`;
    }
    return source.file;
}

export function labelFromType(typeRef) {
    if (!typeRef) {
        return "";
    }
    return typeRef.name || "";
}

export function formatParameters(parameters) {
    return (parameters || []).map((param) => [
        param.name || "",
        renderCodeInline(labelFromType(param.type)),
        // TypeDoc serializes flags sparsely, so missing optional means "required".
        param.optional ? "no" : "yes",
        param.description || "",
    ]);
}

export function formatMembers(members, kindLabel = "property") {
    return (members || [])
        .filter((member) => member.kind === kindLabel || kindLabel === "any")
        .map((member) => [
            member.name || "",
            renderCodeInline(labelFromType(member.type)),
            member.required === true ? "yes" : member.required === false ? "no" : "",
            // Wrap defaults in inline code (like the type column). A raw default
            // such as a multi-line arrow-function getter would otherwise be parsed
            // as inline HTML by VitePress and break the Vue compiler (duplicate
            // attribute) when the markdown is rendered.
            renderCodeInline(member.default),
            member.description || "",
        ]);
}

export function formatBindings(parameters) {
    return (parameters || []).map((param) => [param.name || "", param.description || ""]);
}

export function normalizeTitle(text) {
    return text || "Untitled";
}

export { normalizePath, slugify };
