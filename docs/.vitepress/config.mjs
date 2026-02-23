import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sirv from "sirv";
import { defineConfig } from "vitepress";
import { configureDiagramsPlugin } from "vitepress-plugin-diagrams";

const base = "/vueda/";
const docsRoot = fileURLToPath(new URL("..", import.meta.url));
const generatedRoot = path.join(docsRoot, ".generated");
const apiRoot = path.join(docsRoot, "reference", "api");
const glossaryFile = path.join(docsRoot, "reference", "glossary.md");

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

const parseFrontmatter = (raw) => {
    const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
    if (!match) {
        return { frontmatter: {}, body: raw };
    }
    const frontmatter = {};
    const lines = match[1].split(/\r?\n/);
    for (const line of lines) {
        const idx = line.indexOf(":");
        if (idx <= 0) continue;
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        if (!key) continue;
        if (value.startsWith('"')) {
            try {
                frontmatter[key] = JSON.parse(value);
            } catch {
                frontmatter[key] = value.replace(/^"|"$/g, "");
            }
        } else if (value.startsWith("'")) {
            frontmatter[key] = value.replace(/^'|'$/g, "");
        } else {
            frontmatter[key] = value;
        }
    }
    return { frontmatter, body: raw.slice(match[0].length) };
};

const extractHeading = (body) => {
    const match = body.match(/^#\s+(.+)\s*$/m);
    return match ? match[1].trim() : null;
};

const normalizeTerm = (value) => value.trim().replace(/\s+/g, " ").toLowerCase();

const stripInlineMarkdown = (value) =>
    value
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[*_~]/g, "")
        .trim();

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

    return index;
};

const apiPathForFile = (filePath) => {
    const rel = path.relative(apiRoot, filePath).split(path.sep).join("/");
    if (rel.endsWith("/index.md")) {
        return `/reference/api/${rel.slice(0, -"index.md".length)}`;
    }
    if (rel === "index.md") {
        return "/reference/api/";
    }
    return `/reference/api/${rel}`;
};

const buildApiIndex = () => {
    const index = new Map();
    if (!fs.existsSync(apiRoot)) {
        return index;
    }
    const files = walkFiles(apiRoot).filter((file) => file.endsWith(".md"));
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
        index.set(frontmatter.id, {
            href: apiPathForFile(filePath),
            title,
            filePath,
        });
    }
    return index;
};

const apiIndex = buildApiIndex();
const glossaryIndex = buildGlossaryIndex();

const apiLinkPlugin = (md, options = {}) => {
    const resolve = options.resolve;
    const strict = options.strict !== false;
    const softbreakSpacer = " ";
    const parseApiLink = (src, pos) => {
        const prefix = "{@api";
        if (!src.startsWith(prefix, pos)) {
            return null;
        }

        let i = pos + prefix.length;
        if (i >= src.length || !/\s/.test(src[i])) {
            return null;
        }

        while (i < src.length && /\s/.test(src[i])) {
            i += 1;
        }

        const idStart = i;
        let braceDepth = 0;

        while (i < src.length) {
            const char = src[i];
            if (char === "{") {
                braceDepth += 1;
                i += 1;
                continue;
            }
            if (char === "}") {
                if (braceDepth === 0) {
                    const raw = src.slice(pos, i + 1);
                    const rawId = src.slice(idStart, i).trim();
                    if (!rawId) {
                        return null;
                    }
                    return { raw, rawId, length: raw.length };
                }
                braceDepth -= 1;
            }
            i += 1;
        }

        return null;
    };

    md.inline.ruler.before("emphasis", "vueda-api-link", (state, silent) => {
        const { pos } = state;
        if (state.src.charCodeAt(pos) !== 0x7b) {
            return false;
        }
        const parsed = parseApiLink(state.src, pos);
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
    const parseTermTag = (src, pos) => {
        const prefix = "{@term";
        if (!src.startsWith(prefix, pos)) {
            return null;
        }

        let i = pos + prefix.length;
        if (i >= src.length || !/\s/.test(src[i])) {
            return null;
        }
        while (i < src.length && /\s/.test(src[i])) {
            i += 1;
        }
        const termStart = i;
        while (i < src.length && src[i] !== "}") {
            i += 1;
        }
        if (i >= src.length) {
            return null;
        }
        const raw = src.slice(pos, i + 1);
        const rawTerm = src.slice(termStart, i).trim();
        if (!rawTerm) {
            return null;
        }
        return { raw, rawTerm, length: raw.length };
    };

    md.inline.ruler.before("emphasis", "vueda-term-link", (state, silent) => {
        const { pos } = state;
        if (state.src.charCodeAt(pos) !== 0x7b) {
            return false;
        }
        const parsed = parseTermTag(state.src, pos);
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
        for (const filePath of walkFiles(generatedRoot)) {
            const relPath = path.relative(generatedRoot, filePath).split(path.sep).join("/");
            this.emitFile({
                type: "asset",
                fileName: relPath,
                source: fs.readFileSync(filePath),
            });
        }
    },
});

const posixPath = (value) => value.split(path.sep).join("/");

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

    const languageDirs = fs
        .readdirSync(apiRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));

    return languageDirs.map((languageDir) => {
        const languageRoot = path.join(apiRoot, languageDir);
        const languageIndexPath = path.join(languageRoot, "index.md");
        const languageTitle = fs.existsSync(languageIndexPath) ? readDocMeta(languageIndexPath).title : languageDir;

        const subdirectoryItems = fs
            .readdirSync(languageRoot, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .sort((a, b) => a.localeCompare(b))
            .map((subDirName) => {
                const subDirIndexPath = path.join(languageRoot, subDirName, "index.md");
                const text = fs.existsSync(subDirIndexPath) ? readDocMeta(subDirIndexPath).title : subDirName;
                const link = normalizeDocRoute(`/reference/api/${languageDir}/${subDirName}/`);
                return { text, link };
            });

        const fileItems = fs
            .readdirSync(languageRoot, { withFileTypes: true })
            .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
            .filter((entry) => entry.name !== "index.md")
            .map((entry) => {
                const filePath = path.join(languageRoot, entry.name);
                const { title, sidebarOrder } = readDocMeta(filePath);
                return { text: title, link: toDocRoute(filePath), sidebarOrder };
            })
            .sort(sortDocs)
            .map(({ text, link }) => ({ text, link }));

        const overviewLink = normalizeDocRoute(`/reference/api/${languageDir}/`);
        return {
            text: languageTitle,
            items: [{ text: "Overview", link: overviewLink }, ...subdirectoryItems, ...fileItems],
        };
    });
};

const docsSidebar = {
    "/tutorials/": buildSectionSidebar("tutorials", "Tutorials"),
    "/guides/": buildSectionSidebar("guides", "Guides"),
    "/core-concepts/": buildSectionSidebar("core-concepts", "Core Concepts"),
    "/reference/": buildSectionSidebar("reference", "Reference"),
    "/reference/api/": buildApiSidebar(),
};

export default defineConfig({
    title: "VUEDA",
    description: "Implementor guide, changelog, and reference for VUEDA.",
    lastUpdated: true,
    base,
    outDir: "../site",
    srcExclude: ["**/AGENTS.md", "**/CONTENT_PLAN.md"],
    head: [
        ["link", { rel: "icon", href: `${base}assets/logo-cube.svg` }],
        [
            "link",
            {
                rel: "icon",
                type: "image/png",
                sizes: "32x32",
                href: `${base}assets/logo-cube.png`,
            },
        ],
        ["link", { rel: "apple-touch-icon", href: `${base}assets/logo-cube.png` }],
    ],
    themeConfig: {
        logo: "/assets/logo-cube.svg",
        nav: [
            { text: "About", link: "/" },
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
        },
    },
    vite: {
        server: {
            // Allow reverse-proxy/custom hostnames in local dev.
            allowedHosts: true,
        },
        plugins: [generatedAssetsPlugin()],
    },
});
