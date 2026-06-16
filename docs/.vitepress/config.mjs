import {
    normalizeTerm,
    parseApiRef,
    parseFrontmatter,
    parseTermRef,
    stripInlineMarkdown,
} from "../../docs-tooling/js/utils/reference-parser.js";
import { slugify } from "../../docs-tooling/js/utils/slugify.js";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sirv from "sirv";
import { defineConfig } from "vitepress";
import { configureDiagramsPlugin } from "vitepress-plugin-diagrams";

const base = process.env.VITEPRESS_BASE || "/vueda/";
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

const memberNameFromId = (memberId) => {
    const restResponseMatch = memberId.match(/^rest:endpoint:.*:response:([^:]+)$/);
    if (restResponseMatch) {
        return restResponseMatch[1];
    }
    if (memberId.startsWith("theme-key:") && !memberId.includes(".")) {
        return "";
    }
    const qualName = memberId.replace(/^[^:]+:[^:]+:/, "");
    const hashName = qualName.includes("#") ? qualName.split("#").pop() : qualName;
    if (hashName.includes(".")) {
        return hashName.split(".").pop();
    }
    return hashName;
};

const buildApiIndex = () => {
    const index = new Map();
    for (const { root, urlPrefix } of referenceRoots) {
        if (!fs.existsSync(root)) {
            continue;
        }
        const files = walkFiles(root).filter((file) => file.endsWith(".md"));
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
                        title: `${title}.${memberName}`,
                        filePath,
                    });
                }
            }
        }
    }
    return index;
};

const apiIndex = buildApiIndex();
const glossaryIndex = buildGlossaryIndex();

const apiLinkPlugin = (md, options = {}) => {
    const resolve = options.resolve;
    const strict = options.strict !== false;
    const softbreakSpacer = " ";

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

const buildApiSubItems = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        return [];
    }
    return fs
        .readdirSync(dirPath, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "index.md")
        .map((entry) => {
            const filePath = path.join(dirPath, entry.name);
            const { title, sidebarOrder } = readDocMeta(filePath);
            return { text: title, link: toDocRoute(filePath), sidebarOrder };
        })
        .sort(sortDocs)
        .map(({ text, link }) => ({ text, link }));
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

    const languageGroups = languageDirs.map((languageDir) => {
        const languageRoot = path.join(apiRoot, languageDir);
        const languageIndexPath = path.join(languageRoot, "index.md");
        const languageTitle = fs.existsSync(languageIndexPath) ? readDocMeta(languageIndexPath).title : languageDir;

        const subdirectoryItems = fs
            .readdirSync(languageRoot, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .filter((entry) => !fs.existsSync(path.join(languageRoot, `${entry.name}.md`)))
            .map((entry) => entry.name)
            .sort((a, b) => a.localeCompare(b))
            .map((subDirName) => {
                const subDirPath = path.join(languageRoot, subDirName);
                const subDirIndexPath = path.join(subDirPath, "index.md");
                const text = fs.existsSync(subDirIndexPath) ? readDocMeta(subDirIndexPath).title : subDirName;
                const link = normalizeDocRoute(`/reference/api/${languageDir}/${subDirName}/`);
                const items = buildApiSubItems(subDirPath);
                return items.length ? { text, link, collapsed: false, items } : { text, link };
            });

        const fileItems = fs
            .readdirSync(languageRoot, { withFileTypes: true })
            .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
            .filter((entry) => entry.name !== "index.md")
            .map((entry) => {
                const filePath = path.join(languageRoot, entry.name);
                const stem = entry.name.slice(0, -".md".length);
                const { title, sidebarOrder } = readDocMeta(filePath);
                const link = toDocRoute(filePath);
                const siblingDir = path.join(languageRoot, stem);
                if (fs.existsSync(siblingDir) && fs.statSync(siblingDir).isDirectory()) {
                    const items = buildApiSubItems(siblingDir);
                    if (items.length) {
                        return { text: title, link, collapsed: false, items, sidebarOrder };
                    }
                }
                return { text: title, link, sidebarOrder };
            })
            .sort(sortDocs)
            .map(({ text, link, collapsed, items }) =>
                items !== undefined ? { text, link, collapsed, items } : { text, link },
            );

        const overviewLink = normalizeDocRoute(`/reference/api/${languageDir}/`);
        return {
            text: languageTitle,
            collapsed: true,
            items: [{ text: "Overview", link: overviewLink }, ...subdirectoryItems, ...fileItems],
        };
    });
    return [
        {
            text: "Reference",
            items: [{ text: "Overview", link: "/reference/" }],
        },
        ...languageGroups,
    ];
};

const docsSidebar = {
    "/tutorials/": buildSectionSidebar("tutorials", "Tutorials"),
    "/guides/": buildSectionSidebar("guides", "Guides"),
    "/core-concepts/": buildSectionSidebar("core-concepts", "Core Concepts"),
    "/reference/components/": buildSectionSidebar("reference/components", "Components"),
    "/reference/changelog/": buildSectionSidebar("reference/changelog", "Changelog"),
    "/reference/": buildSectionSidebar("reference", "Reference"),
    "/reference/api/": buildApiSidebar(),
};

const breadcrumbContentDirs = ["tutorials", "guides", "core-concepts", "reference"];
const isExcludedFromBreadcrumbs = (rel) => {
    const base = path.posix.basename(rel);
    if (base === "AGENTS.md" || base === "CONTENT_PLAN.md" || base === "README.md") {
        return true;
    }
    return rel.startsWith("temp/") || rel.includes("/node_modules/") || rel.startsWith("node_modules/");
};

const buildRouteTitleIndex = () => {
    const titles = {};
    const candidates = [];
    const rootIndex = path.join(docsRoot, "index.md");
    if (fs.existsSync(rootIndex)) {
        candidates.push(rootIndex);
    }
    for (const dir of breadcrumbContentDirs) {
        candidates.push(...walkFiles(path.join(docsRoot, dir)).filter((file) => file.endsWith(".md")));
    }
    for (const filePath of candidates) {
        const rel = posixPath(path.relative(docsRoot, filePath));
        if (isExcludedFromBreadcrumbs(rel)) {
            continue;
        }
        const { title } = readDocMeta(filePath);
        let route = toDocRoute(filePath);
        if (route !== "/" && route.endsWith("/")) {
            route = route.slice(0, -1);
        }
        titles[route] = title;
    }
    return titles;
};

const routeTitles = buildRouteTitleIndex();

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
    srcExclude: ["**/AGENTS.md", "**/CONTENT_PLAN.md", "**/README.md", "temp/**"],
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
    themeConfig: {
        logo: "/assets/logo-cube-solid.svg",
        outline: "deep",
        routeTitles,
        vueda: packageVersions,
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
        resolve: {
            alias: {
                "@vueda": fileURLToPath(new URL("../../client/lib/", import.meta.url)),
                "@internationalized/date": fileURLToPath(
                    new URL("../../client/node_modules/@internationalized/date", import.meta.url),
                ),
            },
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
        },
        preview: {
            host: true,
            https: httpsConfig,
        },
        plugins: [tailwindcss(), generatedAssetsPlugin()],
    },
});
