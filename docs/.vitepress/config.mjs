import { formatApiMemberTitle, memberNameFromId } from "../../docs-tooling/js/utils/reference-index.js";
import {
    normalizeTerm,
    parseApiRef,
    parseFrontmatter,
    parseTermRef,
    stripInlineMarkdown,
} from "../../docs-tooling/js/utils/reference-parser.js";
import { slugify } from "../../docs-tooling/js/utils/slugify.js";
import { arraiThemeRoot, buildBreadcrumbRoutes, buildSocialHead } from "@arrai-innovations/vitepress-theme/config";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sirv from "sirv";
import { defineConfig } from "vitepress";
import { configureDiagramsPlugin } from "vitepress-plugin-diagrams";

const base = process.env.VITEPRESS_BASE || "/vueda/";
// Published origin for absolute card URLs. CI publishes each major under
// /v<major>/ at this host, so the base carries the version, not this constant.
const siteUrl = "https://vueda.dev";
const docsRoot = fileURLToPath(new URL("..", import.meta.url));
const generatedRoot = path.join(docsRoot, ".generated");
const apiRoot = path.join(docsRoot, "reference", "api");
const glossaryFile = path.join(docsRoot, "reference", "glossary.md");
const httpsKeyPath = process.env.HTTPS_KEY_PATH || "/etc/pki/tls/private/arrai.com.key";
const httpsCertPath = process.env.HTTPS_CERT_PATH || "/etc/pki/tls/certs/arrai.com.crt";
const useHttps = fs.existsSync(httpsKeyPath) && fs.existsSync(httpsCertPath);
const httpsConfig = useHttps
    ? {
          key: fs.readFileSync(httpsKeyPath),
          cert: fs.readFileSync(httpsCertPath),
      }
    : undefined;
const hmrProtocol = process.env.HMR_PROTOCOL || (useHttps ? "wss" : "ws");
const hmrHost = process.env.HMR_HOST || undefined;
const hmrPort = Number(process.env.HMR_PORT || 5173);
const docsTimingEnabled = /^(1|true|yes|on)$/i.test(process.env.VUEDA_DOCS_TIMING || "");
const docsTimingReportPath = process.env.VUEDA_DOCS_TIMING_FILE
    ? path.resolve(process.cwd(), process.env.VUEDA_DOCS_TIMING_FILE)
    : path.join(docsRoot, ".vitepress", "cache", "build-timing.json");
const docsBuildConcurrency = Number(process.env.VUEDA_DOCS_BUILD_CONCURRENCY || "");
const docsTiming = docsTimingEnabled
    ? {
          startedAt: new Date().toISOString(),
          startedAtMs: performance.now(),
          phases: [],
          metrics: {},
          markdown: {
              pages: [],
              bySection: new Map(),
          },
          html: {
              pages: [],
              bySection: new Map(),
          },
          vite: {
              bundles: [],
          },
      }
    : null;

const formatTimingMs = (value) => Number(value.toFixed(2));

const timeSync = (name, callback) => {
    if (!docsTiming) {
        return callback();
    }
    const startedAtMs = performance.now();
    try {
        return callback();
    } finally {
        docsTiming.phases.push({
            name,
            ms: formatTimingMs(performance.now() - startedAtMs),
        });
    }
};

const setTimingMetric = (name, value) => {
    if (docsTiming) {
        docsTiming.metrics[name] = value;
    }
};

const posixPath = (value) => value.split(path.sep).join("/");

const relativeTimingPath = (value) => {
    if (!value) {
        return "unknown";
    }
    const normalized = posixPath(String(value));
    const normalizedDocsRoot = posixPath(docsRoot);
    if (normalized.startsWith(`${normalizedDocsRoot}/`)) {
        return normalized.slice(normalizedDocsRoot.length + 1);
    }
    return normalized.replace(/^\//, "");
};

const timingSectionForPath = (value) => {
    const rel = relativeTimingPath(value).replace(/\.html$/, ".md");
    if (rel.startsWith("reference/api/js/")) return "reference/api/js";
    if (rel.startsWith("reference/api/vue/")) return "reference/api/vue";
    if (rel.startsWith("reference/api/py/")) return "reference/api/py";
    if (rel.startsWith("reference/api/rest/")) return "reference/api/rest";
    if (rel.startsWith("reference/theming/")) return "reference/theming";
    if (rel.startsWith("reference/")) return "reference/authored";
    if (rel.startsWith("guides/")) return "guides";
    if (rel.startsWith("tutorials/")) return "tutorials";
    if (rel.startsWith("core-concepts/")) return "core-concepts";
    return "other";
};

const addTimingAggregate = (map, section, elapsedMs, bytes = 0) => {
    const current = map.get(section) || {
        count: 0,
        totalMs: 0,
        maxMs: 0,
        totalBytes: 0,
    };
    current.count += 1;
    current.totalMs += elapsedMs;
    current.maxMs = Math.max(current.maxMs, elapsedMs);
    current.totalBytes += bytes;
    map.set(section, current);
};

const summarizeTimingMap = (map) =>
    Object.fromEntries(
        [...map.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([section, item]) => [
                section,
                {
                    count: item.count,
                    totalMs: formatTimingMs(item.totalMs),
                    avgMs: formatTimingMs(item.totalMs / Math.max(item.count, 1)),
                    maxMs: formatTimingMs(item.maxMs),
                    totalBytes: item.totalBytes,
                },
            ]),
    );

const topTimingPages = (pages, key, limit = 20) =>
    [...pages]
        .sort((a, b) => b[key] - a[key])
        .slice(0, limit)
        .map((page) => ({
            ...page,
            [key]: formatTimingMs(page[key]),
        }));

const buildTimingReport = () => {
    if (!docsTiming) {
        return null;
    }
    const wallMs = performance.now() - docsTiming.startedAtMs;
    return {
        startedAt: docsTiming.startedAt,
        finishedAt: new Date().toISOString(),
        wallMs: formatTimingMs(wallMs),
        metrics: docsTiming.metrics,
        phases: docsTiming.phases,
        markdown: {
            bySection: summarizeTimingMap(docsTiming.markdown.bySection),
            slowestPages: topTimingPages(docsTiming.markdown.pages, "renderMs"),
        },
        html: {
            bySection: summarizeTimingMap(docsTiming.html.bySection),
            largestPages: topTimingPages(docsTiming.html.pages, "bytes"),
        },
        vite: docsTiming.vite,
    };
};

const writeTimingReport = (siteConfig) => {
    const report = buildTimingReport();
    if (!report) {
        return;
    }

    fs.mkdirSync(path.dirname(docsTimingReportPath), { recursive: true });
    fs.writeFileSync(docsTimingReportPath, JSON.stringify(report, null, 2));

    const logger = siteConfig?.logger || console;
    logger.info(`[docs timing] wall: ${(report.wallMs / 1000).toFixed(2)}s`);
    logger.info(
        `[docs timing] config phases: ${report.phases
            .map((phase) => `${phase.name} ${phase.ms.toFixed(2)}ms`)
            .join(", ")}`,
    );
    logger.info("[docs timing] markdown by section:");
    for (const [section, item] of Object.entries(report.markdown.bySection)) {
        logger.info(
            `  ${section}: ${item.count} page(s), total ${item.totalMs.toFixed(2)}ms, avg ${item.avgMs.toFixed(2)}ms`,
        );
    }
    logger.info("[docs timing] html by section:");
    for (const [section, item] of Object.entries(report.html.bySection)) {
        logger.info(`  ${section}: ${item.count} page(s), ${item.totalBytes} bytes`);
    }
    logger.info(`[docs timing] report: ${docsTimingReportPath}`);
};

const walkFiles = (dir) => {
    if (!fs.existsSync(dir)) {
        return [];
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.flatMap((entry) => {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            return walkFiles(entryPath);
        }
        return [entryPath];
    });
};

const extractHeading = (body) => {
    const match = body.match(/^#\s+(.+)\s*$/m);
    return match ? match[1].trim() : null;
};

const slugifyHeading = (value) =>
    stripInlineMarkdown(value)
        .toLowerCase()
        .trim()
        .replace(/<[^>]+>/g, "")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");

const buildGlossaryIndex = () => {
    const index = new Map();
    if (!fs.existsSync(glossaryFile)) {
        setTimingMetric("glossary.terms", 0);
        return index;
    }

    const raw = fs.readFileSync(glossaryFile, "utf-8");
    const { body } = parseFrontmatter(raw);
    const headings = body.matchAll(/^##\s+(.+?)\s*$/gm);
    const slugCounts = new Map();

    for (const headingMatch of headings) {
        const term = headingMatch[1].trim();
        if (!term) {
            continue;
        }
        const baseSlug = slugifyHeading(term);
        if (!baseSlug) {
            continue;
        }
        const nextCount = (slugCounts.get(baseSlug) || 0) + 1;
        slugCounts.set(baseSlug, nextCount);
        const slug = nextCount === 1 ? baseSlug : `${baseSlug}-${nextCount - 1}`;
        const key = normalizeTerm(stripInlineMarkdown(term));

        if (index.has(key)) {
            throw new Error(`Duplicate glossary term: ${term}`);
        }
        index.set(key, {
            term,
            href: `/reference/glossary#${slug}`,
        });
    }

    setTimingMetric("glossary.terms", index.size);
    return index;
};

const referenceRoots = [
    { root: apiRoot, urlPrefix: "/reference/api/" },
    { root: path.join(docsRoot, "reference", "theming"), urlPrefix: "/reference/theming/" },
];

const pathForFile = (filePath, root, urlPrefix) => {
    const rel = path.relative(root, filePath).split(path.sep).join("/");
    if (rel.endsWith("/index.md")) {
        return `${urlPrefix}${rel.slice(0, -"index.md".length)}`;
    }
    if (rel === "index.md") {
        return urlPrefix;
    }
    return `${urlPrefix}${rel}`;
};

const buildApiIndex = () => {
    const index = new Map();
    let fileCount = 0;
    for (const { root, urlPrefix } of referenceRoots) {
        if (!fs.existsSync(root)) {
            continue;
        }
        const files = walkFiles(root).filter((file) => file.endsWith(".md"));
        fileCount += files.length;
        for (const filePath of files) {
            const raw = fs.readFileSync(filePath, "utf-8");
            const { frontmatter, body } = parseFrontmatter(raw);
            if (!frontmatter.id) {
                continue;
            }
            if (index.has(frontmatter.id)) {
                throw new Error(`Duplicate API id: ${frontmatter.id}`);
            }
            const title = frontmatter.title || extractHeading(body) || frontmatter.id;
            const pageHref = pathForFile(filePath, root, urlPrefix);
            index.set(frontmatter.id, {
                href: pageHref,
                title,
                filePath,
            });
            if (Array.isArray(frontmatter.member_ids)) {
                for (const memberId of frontmatter.member_ids) {
                    if (!memberId || index.has(memberId)) {
                        continue;
                    }
                    const memberName = memberNameFromId(memberId);
                    const anchor = slugify(memberName);
                    index.set(memberId, {
                        href: anchor ? `${pageHref}#${anchor}` : pageHref,
                        title: formatApiMemberTitle(title, memberName),
                        filePath,
                    });
                }
            }
        }
    }
    setTimingMetric("apiIndex.files", fileCount);
    setTimingMetric("apiIndex.ids", index.size);
    return index;
};

const apiIndex = timeSync("config:api-index", buildApiIndex);
const glossaryIndex = timeSync("config:glossary-index", buildGlossaryIndex);

const escapeAttribute = (value) =>
    String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const apiLinkPlugin = (md, options = {}) => {
    const resolve = options.resolve;
    const strict = options.strict !== false;
    const softbreakSpacer = " ";

    // Demo blocks (`<VuedaDemo>` and friends) are HTML blocks, whose content
    // markdown-it emits raw and never runs an inline rule over. A reference written
    // in a demo caption therefore reached the page as literal `{@api ...}` braces.
    // Resolve those on the raw token content instead, with the same strict-mode
    // contract as the inline rule.
    const resolveInHtml = (src, env) => {
        let out = "";
        let index = 0;
        while (index < src.length) {
            const start = src.indexOf("{@api", index);
            if (start === -1) {
                out += src.slice(index);
                break;
            }
            out += src.slice(index, start);
            const parsed = parseApiRef(src, start);
            if (!parsed) {
                out += "{@api";
                index = start + "{@api".length;
                continue;
            }
            const { raw, rawId, length } = parsed;
            const entry = resolve ? resolve(rawId) : null;
            if (!entry) {
                const hint = env?.relativePath || env?.path || "unknown file";
                const message = `Unknown API id "${rawId}" in ${hint}`;
                if (strict) {
                    throw new Error(message);
                }
                out += raw;
            } else {
                out += `<a href="${escapeAttribute(entry.href)}">${escapeAttribute(entry.title || rawId)}</a>`;
            }
            index = start + length;
        }
        return out;
    };

    md.core.ruler.push("vueda-api-link-html", (state) => {
        for (const token of state.tokens) {
            if (token.type === "html_block") {
                token.content = resolveInHtml(token.content, state.env);
            }
            if (token.children) {
                for (const child of token.children) {
                    if (child.type === "html_inline") {
                        child.content = resolveInHtml(child.content, state.env);
                    }
                }
            }
        }
    });

    md.inline.ruler.before("emphasis", "vueda-api-link", (state, silent) => {
        const { pos } = state;
        if (state.src.charCodeAt(pos) !== 0x7b) {
            return false;
        }
        const parsed = parseApiRef(state.src, pos);
        if (!parsed) {
            return false;
        }
        if (silent) {
            return true;
        }

        const { raw, rawId, length } = parsed;
        const entry = resolve ? resolve(rawId) : null;
        if (!entry) {
            const hint = state.env?.relativePath || state.env?.path || "unknown file";
            const message = `Unknown API id "${rawId}" in ${hint}`;
            if (strict) {
                throw new Error(message);
            }
            const token = state.push("text", "", 0);
            token.content = raw;
            state.pos += length;
            return true;
        }

        const open = state.push("link_open", "a", 1);
        open.attrs = [["href", entry.href]];
        const text = state.push("text", "", 0);
        text.content = entry.title || rawId;
        state.push("link_close", "a", -1);

        let nextPos = pos + length;
        const char = state.src.charCodeAt(nextPos);
        if (char === 0x0a || char === 0x0d) {
            if (char === 0x0d) {
                nextPos += 1;
                if (state.src.charCodeAt(nextPos) === 0x0a) {
                    nextPos += 1;
                }
            } else {
                nextPos += 1;
            }
            while (nextPos < state.src.length) {
                const code = state.src.charCodeAt(nextPos);
                if (code !== 0x20 && code !== 0x09) {
                    break;
                }
                nextPos += 1;
            }
            const spacer = state.push("text", "", 0);
            spacer.content = softbreakSpacer;
        }

        state.pos = nextPos;
        return true;
    });
};

const escapeAttr = (value) =>
    value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const glossaryTermPlugin = (md, options = {}) => {
    const resolve = options.resolve;
    const strict = options.strict !== false;

    md.inline.ruler.before("emphasis", "vueda-term-link", (state, silent) => {
        const { pos } = state;
        if (state.src.charCodeAt(pos) !== 0x7b) {
            return false;
        }
        const parsed = parseTermRef(state.src, pos);
        if (!parsed) {
            return false;
        }
        if (silent) {
            return true;
        }

        const { raw, rawTerm, length } = parsed;
        const entry = resolve ? resolve(rawTerm) : null;
        if (!entry) {
            const hint = state.env?.relativePath || state.env?.path || "unknown file";
            const message = `Unknown glossary term "${rawTerm}" in ${hint}`;
            if (strict) {
                throw new Error(message);
            }
            const token = state.push("text", "", 0);
            token.content = raw;
            state.pos += length;
            return true;
        }

        const token = state.push("html_inline", "", 0);
        token.content = `<GlossaryTerm term="${escapeAttr(entry.term)}" href="${escapeAttr(entry.href)}" />`;
        state.pos += length;
        return true;
    });
};

const instrumentMarkdownTiming = (md) => {
    if (!docsTiming) {
        return;
    }

    const originalRender = md.render.bind(md);
    md.render = (src, env = {}) => {
        const startedAtMs = performance.now();
        try {
            return originalRender(src, env);
        } finally {
            const renderMs = performance.now() - startedAtMs;
            const rel = relativeTimingPath(env.relativePath || env.path || env.filePath || "unknown");
            const section = timingSectionForPath(rel);
            const bytes = Buffer.byteLength(src || "", "utf-8");
            docsTiming.markdown.pages.push({
                path: rel,
                section,
                renderMs,
                bytes,
            });
            addTimingAggregate(docsTiming.markdown.bySection, section, renderMs, bytes);
        }
    };
};

const generatedAssetsPlugin = () => ({
    name: "vueda-generated-assets",
    configureServer(server) {
        if (!fs.existsSync(generatedRoot)) {
            return;
        }
        server.middlewares.use(
            base,
            sirv(generatedRoot, {
                dev: true,
            }),
        );
    },
    generateBundle() {
        if (!fs.existsSync(generatedRoot)) {
            return;
        }
        const startedAtMs = performance.now();
        let count = 0;
        let bytes = 0;
        for (const filePath of walkFiles(generatedRoot)) {
            const source = fs.readFileSync(filePath);
            const relPath = path.relative(generatedRoot, filePath).split(path.sep).join("/");
            count += 1;
            bytes += source.byteLength;
            this.emitFile({
                type: "asset",
                fileName: relPath,
                source,
            });
        }
        if (docsTiming) {
            docsTiming.phases.push({
                name: "vite:generated-assets",
                ms: formatTimingMs(performance.now() - startedAtMs),
                count,
                bytes,
            });
        }
    },
});

const docsTimingPlugin = () => {
    if (!docsTiming) {
        return null;
    }

    let buildNumber = 0;
    let buildStartedAtMs = 0;

    return {
        name: "vueda-docs-timing",
        apply: "build",
        buildStart() {
            buildNumber += 1;
            buildStartedAtMs = performance.now();
        },
        generateBundle(_options, bundle) {
            const outputs = Object.values(bundle);
            docsTiming.vite.bundles.push({
                build: buildNumber,
                phase: "generateBundle",
                outputCount: outputs.length,
                bytes: outputs.reduce((total, output) => {
                    if (output.type === "asset") {
                        if (typeof output.source === "string") {
                            return total + Buffer.byteLength(output.source, "utf-8");
                        }
                        return total + output.source.byteLength;
                    }
                    return total + Buffer.byteLength(output.code || "", "utf-8");
                }, 0),
                elapsedMs: formatTimingMs(performance.now() - buildStartedAtMs),
            });
        },
        closeBundle() {
            docsTiming.vite.bundles.push({
                build: buildNumber,
                phase: "closeBundle",
                elapsedMs: formatTimingMs(performance.now() - buildStartedAtMs),
            });
        },
    };
};

const recordHtmlTiming = (code, id, ctx) => {
    if (!docsTiming) {
        return;
    }
    const rel = relativeTimingPath(ctx?.page || id);
    const section = timingSectionForPath(rel);
    const bytes = Buffer.byteLength(code || "", "utf-8");
    docsTiming.html.pages.push({
        path: rel,
        section,
        bytes,
    });
    addTimingAggregate(docsTiming.html.bySection, section, 0, bytes);
};

const toDocRoute = (filePath) => {
    const rel = posixPath(path.relative(docsRoot, filePath));
    if (rel === "index.md") {
        return "/";
    }
    if (rel.endsWith("/index.md")) {
        return `/${rel.slice(0, -"index.md".length)}`;
    }
    return `/${rel.replace(/\.md$/, "")}`;
};

const normalizeDocRoute = (href) => {
    if (!href) {
        return null;
    }
    const [pathPartRaw, ...hashParts] = href.split("#");
    let pathPart = pathPartRaw || "";
    if (!pathPart.startsWith("/")) {
        pathPart = `/${pathPart}`;
    }
    pathPart = path.posix.normalize(pathPart);
    if (pathPart === "/index") {
        pathPart = "/";
    } else if (pathPart.endsWith("/index")) {
        pathPart = `${pathPart.slice(0, -"/index".length)}/`;
    }
    if (pathPart.endsWith(".md")) {
        pathPart = pathPart.slice(0, -".md".length);
    }
    const hash = hashParts.length > 0 ? `#${hashParts.join("#")}` : "";
    return `${pathPart}${hash}`;
};

const readDocMeta = (filePath) => {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { frontmatter, body } = parseFrontmatter(raw);
    const title = frontmatter.title || extractHeading(body) || path.basename(filePath, ".md");
    const orderValue = Number(frontmatter.sidebar_order);
    const sidebarOrder = Number.isFinite(orderValue) ? orderValue : Number.POSITIVE_INFINITY;
    return { title, sidebarOrder };
};

const sortDocs = (a, b) => {
    if (a.sidebarOrder !== b.sidebarOrder) {
        return a.sidebarOrder - b.sidebarOrder;
    }
    return a.text.localeCompare(b.text);
};

const resolveIndexLink = (sectionDir, rawHref) => {
    if (!rawHref || /^https?:\/\//i.test(rawHref)) {
        return null;
    }
    if (rawHref.startsWith("#")) {
        return `/${sectionDir}/${rawHref}`;
    }
    if (rawHref.startsWith("/")) {
        return normalizeDocRoute(rawHref);
    }
    return normalizeDocRoute(path.posix.join(`/${sectionDir}/`, rawHref));
};

const sectionGroupsFromIndex = (sectionDir) => {
    const indexPath = path.join(docsRoot, sectionDir, "index.md");
    if (!fs.existsSync(indexPath)) {
        return [];
    }
    const raw = fs.readFileSync(indexPath, "utf-8");
    const { body } = parseFrontmatter(raw);
    const lines = body.split(/\r?\n/);
    const groups = [];
    let currentGroup = null;

    const flushGroup = () => {
        if (currentGroup && currentGroup.items.length > 0) {
            groups.push(currentGroup);
        }
    };

    for (const line of lines) {
        const headingMatch = line.match(/^##\s+(.+?)\s*$/);
        if (headingMatch) {
            flushGroup();
            currentGroup = {
                text: stripInlineMarkdown(headingMatch[1].trim()),
                items: [],
            };
            continue;
        }
        const linkMatch = line.match(/^\s*-\s+\[([^\]]+)\]\(([^)]+)\)/);
        if (!linkMatch || !currentGroup) {
            continue;
        }
        const text = stripInlineMarkdown(linkMatch[1].trim());
        const link = resolveIndexLink(sectionDir, linkMatch[2].trim());
        if (!text || !link) {
            continue;
        }
        if (currentGroup.items.some((item) => item.link === link)) {
            continue;
        }
        currentGroup.items.push({ text, link });
    }

    flushGroup();
    return groups;
};

const sectionItemsFromFiles = (sectionDir) => {
    const sectionRoot = path.join(docsRoot, sectionDir);
    if (!fs.existsSync(sectionRoot)) {
        return [];
    }
    return walkFiles(sectionRoot)
        .filter((filePath) => filePath.endsWith(".md"))
        .filter((filePath) => path.basename(filePath) !== "index.md")
        .map((filePath) => {
            const { title, sidebarOrder } = readDocMeta(filePath);
            return {
                text: title,
                link: toDocRoute(filePath),
                sidebarOrder,
            };
        })
        .sort(sortDocs)
        .map(({ text, link }) => ({ text, link }));
};

const buildSectionSidebar = (sectionDir, sectionTitle) => {
    const overviewLink = `/${sectionDir}/`;
    const groups = sectionGroupsFromIndex(sectionDir);
    if (groups.length > 0) {
        const hasOverview = groups.some((group) => group.items.some((item) => item.link === overviewLink));
        return [
            ...(hasOverview
                ? []
                : [
                      {
                          text: sectionTitle,
                          items: [{ text: "Overview", link: overviewLink }],
                      },
                  ]),
            ...groups,
        ];
    }
    const fileItems = sectionItemsFromFiles(sectionDir);
    return [
        {
            text: sectionTitle,
            items: [{ text: "Overview", link: overviewLink }, ...fileItems],
        },
    ];
};

const buildApiSidebar = () => {
    if (!fs.existsSync(apiRoot)) {
        return [];
    }
    setTimingMetric("apiSidebar.mode", "compact");

    const languageDirs = fs
        .readdirSync(apiRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));
    setTimingMetric("apiSidebar.languages", languageDirs.length);

    return [
        {
            text: "Reference",
            items: [{ text: "Overview", link: "/reference/" }],
        },
        {
            text: "API",
            collapsed: false,
            items: languageDirs.map((languageDir) => {
                const languageRoot = path.join(apiRoot, languageDir);
                const languageIndexPath = path.join(languageRoot, "index.md");
                const text = fs.existsSync(languageIndexPath) ? readDocMeta(languageIndexPath).title : languageDir;
                return {
                    text,
                    link: normalizeDocRoute(`/reference/api/${languageDir}/`),
                };
            }),
        },
    ];
};

const docsSidebar = timeSync("config:sidebar", () => ({
    "/tutorials/": buildSectionSidebar("tutorials", "Tutorials"),
    "/guides/": buildSectionSidebar("guides", "Guides"),
    "/core-concepts/": buildSectionSidebar("core-concepts", "Core Concepts"),
    "/reference/components/": buildSectionSidebar("reference/components", "Components"),
    "/reference/changelog/": buildSectionSidebar("reference/changelog", "Changelog"),
    "/reference/": buildSectionSidebar("reference", "Reference"),
    "/reference/api/": buildApiSidebar(),
}));

// Mirrors `srcExclude` below: pages VitePress never renders must not become
// breadcrumb links.
const isExcludedFromBreadcrumbs = (rel) => {
    const base = path.posix.basename(rel);
    if (base === "AGENTS.md" || base === "CLAUDE.md" || base === "CONTENT_PLAN.md" || base === "README.md") {
        return true;
    }
    return rel.startsWith("temp/");
};

const breadcrumbRoutes = timeSync("config:breadcrumb-routes", () =>
    buildBreadcrumbRoutes({
        docsRoot,
        exclude: isExcludedFromBreadcrumbs,
        // Reuse the frontmatter/heading resolution the sidebars already run on,
        // so a page carries one title across both.
        getTitle: ({ filePath }) => readDocMeta(filePath).title,
    }),
);

// Stamp the docs with the client and server versions present at the tagged
// commit. Read from source so this works in local dev and CI without needing
// the Python venv: client/package.json is the npm package version, and the
// server's __init__.py holds the literal __version__ that pyproject reads.
const repoRoot = path.join(docsRoot, "..");

const readClientVersion = () => {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "client", "package.json"), "utf-8"));
        return pkg.version || null;
    } catch {
        return null;
    }
};

const readServerVersion = () => {
    try {
        const src = fs.readFileSync(path.join(repoRoot, "server", "vueda", "__init__.py"), "utf-8");
        const match = src.match(/^__version__\s*=\s*["']([^"']+)["']/m);
        return match ? match[1] : null;
    } catch {
        return null;
    }
};

const packageVersions = {
    client: readClientVersion(),
    server: readServerVersion(),
};

export default defineConfig({
    title: "VUEDA",
    description: "integrator guide, changelog, and reference for VUEDA.",
    lastUpdated: true,
    base,
    outDir: "../site",
    // Build output goes to /static/ so that /assets/ holds only the verbatim
    // copies from docs/public/assets. Hashed files can then be served with
    // Cache-Control: immutable by directory, and the unhashed logos we link
    // from npm and PyPI keep stable /assets/ URLs.
    assetsDir: "static",
    metaChunk: true,
    buildConcurrency:
        Number.isFinite(docsBuildConcurrency) && docsBuildConcurrency > 0 ? docsBuildConcurrency : undefined,
    srcExclude: ["**/AGENTS.md", "**/CLAUDE.md", "**/CONTENT_PLAN.md", "**/README.md", "temp/**"],
    head: [
        ["link", { rel: "icon", href: `${base}assets/logo-cube-solid.svg` }],
        [
            "link",
            {
                rel: "icon",
                type: "image/png",
                sizes: "32x32",
                href: `${base}assets/logo-cube-solid.png`,
            },
        ],
        ["link", { rel: "apple-touch-icon", href: `${base}assets/logo-cube-solid.png` }],
    ],
    // Link-preview crawlers read the served HTML and run no JavaScript, so the
    // Open Graph and Twitter card tags have to be in the page before hydration.
    // The shared theme shapes them; the origin, card image, and colour stay here.
    //
    // A page that writes its own og: or twitter: tag keeps it: the generated tag
    // for that property is dropped rather than emitted twice, since a crawler
    // reading two og:title tags picks one of them arbitrarily.
    transformPageData(pageData, { siteConfig }) {
        const authoredHead = pageData.frontmatter.head ?? [];
        const authored = new Set(authoredHead.map(([, attributes = {}]) => attributes.property ?? attributes.name));
        return {
            frontmatter: {
                ...pageData.frontmatter,
                head: [
                    ...authoredHead,
                    ...buildSocialHead({
                        siteUrl,
                        base: siteConfig.site.base,
                        pageData,
                        siteData: siteConfig.site,
                        image: "/assets/social-card.png",
                        imageSize: { width: 1200, height: 630 },
                        imageAlt: "The VUEDA wordmark above the words: integrator guide, changelog, and reference",
                        themeColor: "#0077f7",
                    }).filter(([, attributes]) => !authored.has(attributes.property ?? attributes.name)),
                ],
            },
        };
    },
    themeConfig: {
        siteTitle: "vueda",
        logo: "/assets/logo-cube-solid.svg",
        search: { provider: "local" },
        outline: "deep",
        breadcrumbs: { routes: breadcrumbRoutes },
        vueda: packageVersions,
        nav: [
            { text: "Home", link: "/" },
            { text: "Tutorials", link: "/tutorials/" },
            { text: "Guides", link: "/guides" },
            { text: "Core Concepts", link: "/core-concepts" },
            { text: "Reference", link: "/reference" },
        ],
        sidebar: docsSidebar,
        socialLinks: [
            { icon: "github", link: "https://github.com/arrai-innovations/vueda" },
            {
                icon: {
                    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 118.4415 135.87849"><g transform="translate(-306.49354,-190.13726)"><path d="m 380.76404,247.35412 -15.04488,-8.687 -14.98,8.731 14.97463,8.645 15.05025,-8.689" style="fill:currentColor"/><path d="m 348.41391,317.57824 14.93113,8.4375 0,-65.87012 -14.93113,-8.6215 0,66.05412" style="fill:currentColor"/><path d="m 368.08141,260.14562 0,65.87012 15.11475,-8.44962 0,-66.1465 -15.11475,8.726" style="fill:currentColor"/><path d="m 365.70741,190.13724 -56.55525,33.25 17.07325,9.8575 39.482,-22.95375 39.57888,22.905 16.99,-9.80875 -56.56888,-33.25" style="fill:currentColor"/><path d="m 407.74379,237.24624 0,66.46337 17.19125,-9.81887 0,-66.56975 -17.19125,9.92525" style="fill:currentColor"/><path d="m 403.00754,303.70961 0,-66.36037 -37.30013,-21.5845 -37.1045,21.57675 0,66.36813 15.07375,-9.81738 0,-47.86187 22.03125,-12.83938 22.22363,12.83313 0,47.86812 15.076,9.81737" style="fill:currentColor"/><path d="m 306.49354,293.89224 17.372,9.81737 0,-66.35649 -17.372,-10.03213 0,66.57125" style="fill:currentColor"/></g></svg>',
                },
                link: "https://arrai.com",
                ariaLabel: "Arrai Innovations",
            },
        ],
    },
    markdown: {
        config: (md) => {
            configureDiagramsPlugin(md, {
                diagramsDir: path.join(generatedRoot, "diagrams"),
                publicPath: `${base}diagrams`,
            });
            md.use(apiLinkPlugin, {
                resolve: (id) => apiIndex.get(id),
                strict: process.env.NODE_ENV === "production",
            });
            md.use(glossaryTermPlugin, {
                resolve: (term) => glossaryIndex.get(normalizeTerm(stripInlineMarkdown(term))),
                strict: process.env.NODE_ENV === "production",
            });
            instrumentMarkdownTiming(md);
        },
    },
    transformHtml: docsTiming
        ? (code, id, ctx) => {
              recordHtmlTiming(code, id, ctx);
          }
        : undefined,
    buildEnd: docsTiming ? writeTimingReport : undefined,
    vite: {
        resolve: {
            alias: {
                "@vueda": fileURLToPath(new URL("../../client/lib/", import.meta.url)),
                "@internationalized/date": fileURLToPath(
                    new URL("../../client/node_modules/@internationalized/date", import.meta.url),
                ),
                // vue-router is a client dependency, not a docs one. The auth-view demos
                // (AuthDemo) need it, but declaring it as a direct docs dependency changes
                // vite's SSR externalization globally and breaks the production build with a
                // CJS/ESM "vue has no default export" error. Alias to the client's copy (as
                // with @internationalized/date) so it resolves without being a docs dep;
                // AuthDemo only imports it via a client-only dynamic import.
                "vue-router": fileURLToPath(new URL("../../client/node_modules/vue-router", import.meta.url)),
            },
        },
        ssr: {
            // Bundle vue-router as ESM for the SSR build instead of externalizing its CJS
            // entry, which does `require("vue")` and breaks Node ESM instantiation with a
            // "vue has no default export" error. Pairs with the vue-router resolve alias.
            // The shared theme publishes Vue SFC source and must also remain in
            // VitePress's SSR bundle.
            noExternal: ["vue-router", "@arrai-innovations/vitepress-theme"],
        },
        server: {
            host: true,
            https: httpsConfig,
            hmr: hmrHost
                ? {
                      host: hmrHost,
                      port: hmrPort,
                      protocol: hmrProtocol,
                  }
                : true,
            // Allow reverse-proxy/custom hostnames in local dev.
            allowedHosts: true,
            // Local `link:` installs resolve the theme and its fonts outside
            // this repository. Published installs remain inside repoRoot.
            fs: { allow: [repoRoot, arraiThemeRoot] },
        },
        preview: {
            host: true,
            https: httpsConfig,
        },
        plugins: [tailwindcss(), generatedAssetsPlugin(), docsTimingPlugin()].filter(Boolean),
    },
});
