/** Run the docs-tooling exporter before bundling and serve fresh exports in development. */
import { exportMarkdown, isPublishedMarkdown } from "../exporters/markdown.js";
import path from "node:path";

export function markdownDocsPlugin({ docsRoot, repoRoot, siteUrl }) {
    let base;
    let isSsr;
    let command;
    let outputs = new Map();
    let dependencies = new Set();
    let dirty = true;
    let pending;
    let server;
    const regenerate = async () => {
        if (!dirty && !pending) {
            return;
        }
        if (!pending) {
            dirty = false;
            pending = exportMarkdown({ docsRoot, repoRoot, siteUrl, base })
                .then((result) => {
                    outputs = result.outputs;
                    dependencies = new Set(result.dependencies);
                    server?.watcher.add(result.dependencies);
                })
                .catch((error) => {
                    dirty = true;
                    throw error;
                })
                .finally(() => {
                    pending = undefined;
                });
        }
        await pending;
        if (dirty) {
            await regenerate();
        }
    };
    return {
        name: "vueda-markdown-docs",
        configResolved(config) {
            base = config.base;
            isSsr = Boolean(config.build.ssr);
            command = config.command;
        },
        async buildStart() {
            if (command === "build" && !isSsr) {
                dirty = true;
                await regenerate();
            }
        },
        generateBundle() {
            if (!isSsr) {
                for (const [fileName, source] of outputs) {
                    this.emitFile({ type: "asset", fileName, source });
                }
            }
        },
        async configureServer(devServer) {
            server = devServer;
            // Draft HTML pages can contain references that do not exist yet. Keep the
            // dev server available; Markdown requests report the export error.
            try {
                await regenerate();
            } catch (error) {
                server.config.logger.warn(`Markdown export unavailable: ${error.message}`);
            }
            const externalIds = path.join(repoRoot, "docs-tooling", ".generated", "external-ids.json");
            server.watcher.add([path.join(repoRoot, "changelog.d"), externalIds]);
            server.watcher.on("all", (_event, file) => {
                const relative = path.relative(docsRoot, file).split(path.sep).join("/");
                if (
                    (!relative.startsWith("..") && isPublishedMarkdown(relative)) ||
                    dependencies.has(file) ||
                    file === externalIds ||
                    file.startsWith(path.join(repoRoot, "changelog.d") + path.sep)
                ) {
                    dirty = true;
                }
            });
            server.middlewares.use(async (req, res, next) => {
                // Browser module imports must continue through Vite's Markdown compiler.
                if (req.headers["sec-fetch-dest"] === "script" || req.url.includes("?") || !req.url.startsWith(base)) {
                    return next();
                }
                let relative;
                try {
                    relative = decodeURIComponent(req.url.slice(base.length));
                } catch {
                    return next();
                }
                if (!relative.endsWith(".md") && !["llms.txt", "llms-full.txt", "symbols.json"].includes(relative)) {
                    return next();
                }
                try {
                    await regenerate();
                    const content = outputs.get(relative);
                    if (content === undefined) {
                        return next();
                    }
                    const contentType = relative.endsWith(".md")
                        ? "text/markdown"
                        : relative.endsWith(".json")
                          ? "application/json"
                          : "text/plain";
                    res.setHeader("Content-Type", `${contentType}; charset=utf-8`);
                    res.setHeader("Cache-Control", "no-cache");
                    res.end(content);
                } catch (error) {
                    next(error);
                }
            });
        },
    };
}
