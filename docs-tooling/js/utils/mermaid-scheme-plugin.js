/**
 * markdown-it plugin that renders each mermaid fence once per color scheme.
 *
 * `vitepress-plugin-diagrams` renders diagrams to static SVG files that the
 * page shows with `<img>`, so page CSS cannot restyle them. This plugin
 * adds each scheme's mermaid config to the diagram's frontmatter, renders one
 * figure per scheme, and wraps each figure in a
 * `vueda-diagram-<scheme>` element. Site CSS then shows the figure that
 * matches the active VitePress color scheme.
 */
import path from "node:path";

const DIAGRAM_COMMENT = /<!--\s*diagram(?:\s+id="([^"]+)")?/;
const DIAGRAM_CAPTION = /\s+caption="([^"]+)"/;
const FRONTMATTER_OPEN = /^---\r?\n/;

/**
 * Add a `config` key to the diagram's frontmatter. Mermaid 12 ignores
 * `%%{init}%%` directives, so frontmatter is the only place for config.
 * A diagram that sets its own `config` would conflict, so it is an error.
 */
const withConfig = (source, config, env) => {
    const line = `config: ${JSON.stringify(config)}\n`;
    if (!FRONTMATTER_OPEN.test(source)) {
        return `---\n${line}---\n${source}`;
    }
    if (/^config:/m.test(source.split(/^---\s*$/m)[1] ?? "")) {
        throw new Error(
            `Mermaid diagram in ${env?.relativePath || env?.path || "unknown file"} sets frontmatter config; ` +
                "the docs color schemes supply it",
        );
    }
    return source.replace(FRONTMATTER_OPEN, (open) => `${open}${line}`);
};

/**
 * Read the `<!-- diagram id="..." caption="..." -->` comment that may follow a
 * fence. The pattern matches the one that `vitepress-plugin-diagrams` reads.
 */
const readDiagramComment = (tokens, idx) => {
    const next = tokens[idx + 1];
    if (next?.type !== "html_block") {
        return { id: undefined, caption: "" };
    }
    return {
        id: next.content.match(DIAGRAM_COMMENT)?.[1]?.trim(),
        caption: next.content.match(DIAGRAM_CAPTION)?.[1]?.trim() || "",
    };
};

/**
 * @param {import("markdown-it").default} md
 * @param {object} options
 * @param {Record<string, object>} options.schemes - Mermaid config for each
 *   scheme name, such as `{ light: {...}, dark: {...} }`.
 * @param {(source: string, diagram: {caption: string, id?: string, name: string}) => string} options.render -
 *   Renders one diagram source to figure HTML. `id` and `name` carry the
 *   scheme suffix, so each scheme gets its own SVG file.
 */
export const mermaidSchemePlugin = (md, options) => {
    const { schemes, render } = options;
    const fallback = md.renderer.rules.fence;

    md.renderer.rules.fence = (tokens, idx, mdOptions, env, self) => {
        const token = tokens[idx];
        if (token.info.trim().toLowerCase() !== "mermaid") {
            return fallback(tokens, idx, mdOptions, env, self);
        }
        const source = token.content.trim();
        const { id, caption } = readDiagramComment(tokens, idx);
        const name = `${path.basename(env?.path || "unknown", ".md")}-${idx}`;
        return Object.entries(schemes)
            .map(([scheme, config]) => {
                const figure = render(withConfig(source, config, env), {
                    caption,
                    id: id && `${id}-${scheme}`,
                    name: `${name}-${scheme}`,
                });
                return `<div class="vueda-diagram-${scheme}">${figure}</div>`;
            })
            .join("\n");
    };
};
