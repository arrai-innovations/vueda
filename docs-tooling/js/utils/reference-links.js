/** Shared link targets and labels for the HTML and Markdown documentation. */
import { apiMemberTitle, memberAnchorFromId } from "./reference-index.js";
import { normalizeTerm, parseFrontmatter, stripInlineMarkdown } from "./reference-parser.js";
import { walkFiles } from "./walk-files.js";
import fs from "node:fs";
import path from "node:path";

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

export const buildGlossaryLinks = (glossaryFile) => {
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

export const buildApiLinks = (docsRoot, externalIdsFile) => {
    const referenceRoots = [
        { root: path.join(docsRoot, "reference", "api"), urlPrefix: "/reference/api/" },
        { root: path.join(docsRoot, "reference", "theming"), urlPrefix: "/reference/theming/" },
    ];
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
                    const anchor = memberAnchorFromId(memberId);
                    index.set(memberId, {
                        href: anchor ? `${pageHref}#${anchor}` : pageHref,
                        title: apiMemberTitle(title, memberId),
                        filePath,
                    });
                }
            }
        }
    }
    // Upstream documentation ids, which the docs-tooling external extractor writes as a flat map.
    if (externalIdsFile && fs.existsSync(externalIdsFile)) {
        for (const [id, entry] of Object.entries(JSON.parse(fs.readFileSync(externalIdsFile, "utf-8")))) {
            index.set(id, { href: entry.href, title: entry.title, external: true });
        }
    }
    return index;
};
