/**
 * External documentation extraction.
 *
 * Builds the `ext:<package>:<name>` ids that authored pages use to link upstream documentation.
 * `external-docs.json` lists each package. A package whose documentation publishes a Sphinx
 * inventory (`objects.inv`) contributes every Python object and setting in it, at the version
 * `uv.lock` pins. Any other package lists its links by hand, and each of those pages is fetched to
 * confirm the page and its anchor exist.
 *
 * The result is a flat map of id to `{ href, title }`, written to `.generated/external-ids.json`,
 * which the reference validator and the VitePress site both read. Every download is also kept in
 * `.cache/external/`, which this extract falls back to when the network is unavailable.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const DEFAULT_CONFIG = path.join(repoRoot, "docs-tooling", "external-docs.json");
const DEFAULT_LOCK = path.join(repoRoot, "uv.lock");

const INVENTORY_LINE_RE = /^(.+?)\s+(\S+):(\S+)\s+(-?\d+)\s+(\S+)\s+(.*)$/;
// Roles whose last two name segments read better than one: a method or attribute is named with its class.
const MEMBER_ROLES = new Set(["method", "attribute", "property", "classmethod", "staticmethod"]);

/**
 * Parse a Sphinx version 2 inventory into `{ name, domain, role, uri }` entries.
 *
 * `uri` is relative to the documentation root, with the `$` shorthand expanded to the name.
 */
export function parseInventory(buffer) {
    const text = Buffer.from(buffer);
    let offset = 0;
    for (let line = 0; line < 4; line += 1) {
        offset = text.indexOf(0x0a, offset) + 1;
        if (offset === 0) {
            throw new Error("Truncated Sphinx inventory header");
        }
    }
    const header = text.subarray(0, offset).toString("utf-8");
    if (!header.startsWith("# Sphinx inventory version 2")) {
        throw new Error("Not a Sphinx inventory version 2 file");
    }
    const body = inflateSync(text.subarray(offset)).toString("utf-8");
    const entries = [];
    for (const line of body.split("\n")) {
        const match = line.match(INVENTORY_LINE_RE);
        if (!match) {
            continue;
        }
        const [, name, domain, role, , uri] = match;
        entries.push({ name, domain, role, uri: uri.endsWith("$") ? uri.slice(0, -1) + name : uri });
    }
    return entries;
}

/**
 * Return `{ [packageName]: version }` from the text of `uv.lock`.
 *
 * A lockfile can pin two versions of one package for different Python versions (Django 5.2 below
 * Python 3.12 and 6.1 above, for example). The highest one wins, which is the one the docs build
 * environment runs.
 */
export function lockVersions(lockText) {
    const versions = {};
    for (const block of lockText.split("[[package]]")) {
        const name = block.match(/^name = "([^"]+)"$/m);
        const version = block.match(/^version = "([^"]+)"$/m);
        if (name && version && compareVersions(version[1], versions[name[1]]) > 0) {
            versions[name[1]] = version[1];
        }
    }
    return versions;
}

function compareVersions(left, right) {
    if (!right) {
        return 1;
    }
    const a = left.split(".").map((part) => parseInt(part, 10) || 0);
    const b = right.split(".").map((part) => parseInt(part, 10) || 0);
    for (let position = 0; position < Math.max(a.length, b.length); position += 1) {
        const difference = (a[position] || 0) - (b[position] || 0);
        if (difference) {
            return difference;
        }
    }
    return 0;
}

/**
 * Fill `{version}` and `{minor}` in a URL template from a pinned version.
 */
export function fillVersion(template, version) {
    if (!template.includes("{")) {
        return template;
    }
    if (!version) {
        throw new Error(`No pinned version for ${template}`);
    }
    return template.replaceAll("{version}", version).replaceAll("{minor}", version.split(".").slice(0, 2).join("."));
}

function shortName(name, role) {
    const parts = name.split(".");
    return parts.slice(MEMBER_ROLES.has(role) ? -2 : -1).join(".");
}

/**
 * Name a hand-listed entry, keeping its class when the entry is a member of one
 * (`GenericAPIView.get_object`), since a registry entry carries no role.
 */
function registryShortName(name) {
    const parts = name.split(".");
    const last = parts.at(-1);
    const owner = parts.at(-2);
    const isMember = owner !== undefined && /^[A-Z]/.test(owner) && /^[a-z_]/.test(last);
    return isMember ? `${owner}.${last}` : last;
}

/**
 * Return the ids an inventory contributes: `ext:<package>:<name>` for each Python object, and
 * `ext:<package>:setting:<name>` for each setting. The first entry for a name wins.
 */
export function inventoryIds(packageKey, config, entries, base) {
    const ids = {};
    for (const entry of entries) {
        let id;
        let label;
        if (entry.domain === "py") {
            id = `ext:${packageKey}:${entry.name}`;
            label = shortName(entry.name, entry.role);
        } else if (entry.domain === "std" && entry.role === "setting") {
            id = `ext:${packageKey}:setting:${entry.name}`;
            label = entry.name;
        } else {
            continue;
        }
        if (!ids[id]) {
            ids[id] = { href: new URL(entry.uri, base).href, title: `${config.title}: ${label}` };
        }
    }
    return ids;
}

/**
 * Return the ids a package lists by hand, as `ext:<package>:<name>`.
 */
export function registryIds(packageKey, config) {
    const ids = {};
    for (const [name, href] of Object.entries(config.links || {})) {
        ids[`ext:${packageKey}:${name}`] = { href, title: `${config.title}: ${registryShortName(name)}` };
    }
    return ids;
}

/**
 * Fetch each hand-listed page once and report a page that fails or lacks a listed anchor.
 *
 * GitHub renders a README heading's id with a `user-content-` prefix, so either form counts.
 */
export async function checkRegistryLinks(config, fetchPage) {
    const anchorsByPage = new Map();
    for (const packageConfig of Object.values(config)) {
        for (const href of Object.values(packageConfig.links || {})) {
            const url = new URL(href);
            const anchor = url.hash.slice(1);
            url.hash = "";
            const page = url.href;
            if (!anchorsByPage.has(page)) {
                anchorsByPage.set(page, new Set());
            }
            if (anchor) {
                anchorsByPage.get(page).add(anchor);
            }
        }
    }
    const errors = [];
    for (const [page, anchors] of anchorsByPage) {
        let html;
        try {
            html = await fetchPage(page);
        } catch (error) {
            errors.push(`${page}: ${error.message}`);
            continue;
        }
        for (const anchor of anchors) {
            if (!html.includes(`id="${anchor}"`) && !html.includes(`id="user-content-${anchor}"`)) {
                errors.push(`${page}#${anchor}: no element has this id`);
            }
        }
    }
    return errors;
}

const DEFAULT_CACHE_DIR = path.join(repoRoot, "docs-tooling", ".cache", "external");
const FETCH_TIMEOUT_MS = 20000;

/**
 * Fetch `url` and keep a copy in `cacheDir`, or return the kept copy when the network fails.
 *
 * Only a network failure falls back to the cache. An HTTP error status still fails, because a page
 * that upstream removed is what the registry check exists to report. Running this extract once
 * while online primes the cache for offline work.
 */
export async function cachedFetch(url, { cacheDir = DEFAULT_CACHE_DIR, fetchImpl = fetch, warn = console.warn } = {}) {
    const cacheFile = path.join(cacheDir, `${createHash("sha256").update(url).digest("hex")}.bin`);
    let response;
    try {
        response = await fetchImpl(url, { redirect: "follow", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    } catch (error) {
        let cached;
        try {
            cached = await readFile(cacheFile);
        } catch {
            throw new Error(
                `${error.message}, and no cached copy exists. Run \`docs-tooling.js extract --target external\` ` +
                    `while online to fill ${path.relative(repoRoot, cacheDir)}/.`,
            );
        }
        warn(`Using the cached copy of ${url}: ${error.message}`);
        return cached;
    }
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    const body = Buffer.from(await response.arrayBuffer());
    await mkdir(cacheDir, { recursive: true });
    await writeFile(cacheFile, body);
    return body;
}

export class ExternalDocsExtractor {
    /**
     * @param {object} [options]
     * @param {(url: string) => Promise<ArrayBuffer>} [options.fetchInventory] - Fetches an inventory.
     * @param {(url: string) => Promise<string>} [options.fetchPage] - Fetches a hand-listed page.
     * @param {string} [options.cacheDir] - Where the default fetchers keep copies for offline use.
     */
    constructor({ fetchInventory, fetchPage, cacheDir } = {}) {
        this.fetchInventory = fetchInventory || ((url) => cachedFetch(url, { cacheDir }));
        this.fetchPage = fetchPage || (async (url) => (await cachedFetch(url, { cacheDir })).toString("utf-8"));
    }

    async extract({ outputPath, configPath = DEFAULT_CONFIG, lockPath = DEFAULT_LOCK } = {}) {
        const config = JSON.parse(await readFile(configPath, "utf-8"));
        const versions = lockVersions(await readFile(lockPath, "utf-8"));

        const ids = {};
        for (const [packageKey, packageConfig] of Object.entries(config)) {
            if (packageConfig.links) {
                Object.assign(ids, registryIds(packageKey, packageConfig));
                continue;
            }
            const version = versions[packageConfig.lockPackage];
            const base = fillVersion(packageConfig.base, version);
            const inventoryUrl = packageConfig.inventory
                ? fillVersion(packageConfig.inventory, version)
                : new URL("objects.inv", base).href;
            let entries;
            try {
                entries = parseInventory(await this.fetchInventory(inventoryUrl));
            } catch (error) {
                throw new Error(`${packageKey} inventory ${inventoryUrl}: ${error.message}`);
            }
            Object.assign(ids, inventoryIds(packageKey, packageConfig, entries, base));
        }

        const linkErrors = await checkRegistryLinks(config, this.fetchPage);
        if (linkErrors.length) {
            throw new Error(`Broken external links in external-docs.json:\n${linkErrors.join("\n")}`);
        }

        await mkdir(path.dirname(outputPath), { recursive: true });
        await writeFile(outputPath, JSON.stringify(ids, null, 2));
        return ids;
    }
}
