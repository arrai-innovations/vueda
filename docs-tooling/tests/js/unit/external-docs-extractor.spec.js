import {
    ExternalDocsExtractor,
    cachedFetch,
    checkRegistryLinks,
    fillVersion,
    installedVersions,
    inventoryIds,
    lockVersions,
    parseInventory,
    registryIds,
} from "../../../js/extractors/external-docs.js";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

function inventory(lines) {
    const header = "# Sphinx inventory version 2\n# Project: Example\n# Version: 1.0\n# The remainder is zlib.\n";
    return Buffer.concat([Buffer.from(header), deflateSync(Buffer.from(lines.join("\n") + "\n"))]);
}

const EXAMPLE_INVENTORY = inventory([
    "example.models.GeneratedField py:class 1 ref/models/fields/#$ -",
    "example.forms.Form.changed_data py:attribute 1 ref/forms/api/#$ -",
    "example.forms.Form.changed_data py:method 1 elsewhere/#$ -",
    "DEBUG std:setting -1 ref/settings/#std-setting-DEBUG -",
    "some-label std:label -1 topics/#some-label Some label",
]);

describe("parseInventory", () => {
    it("reads each entry and expands the $ shorthand", () => {
        const entries = parseInventory(EXAMPLE_INVENTORY);
        expect(entries[0]).toEqual({
            name: "example.models.GeneratedField",
            domain: "py",
            role: "class",
            uri: "ref/models/fields/#example.models.GeneratedField",
        });
        expect(entries.at(-1).name).toBe("some-label");
    });

    it("rejects a file that is not a version 2 inventory", () => {
        expect(() => parseInventory(Buffer.from("a\nb\nc\nd\n"))).toThrow("version 2");
    });
});

describe("lockVersions", () => {
    it("keeps the highest version a lockfile pins for a package", () => {
        const lock = [
            "[[package]]",
            'name = "django"',
            'version = "6.1"',
            "",
            "[[package]]",
            'name = "django"',
            'version = "5.2.17"',
            "",
            "[[package]]",
            'name = "celery"',
            'version = "5.6.3"',
        ].join("\n");
        expect(lockVersions(lock)).toEqual({ django: "6.1", celery: "5.6.3" });
    });
});

describe("fillVersion", () => {
    it("fills the full and minor version", () => {
        expect(fillVersion("https://example.test/en/{minor}/v{version}/", "5.2.17")).toBe(
            "https://example.test/en/5.2/v5.2.17/",
        );
    });

    it("needs a version only when the template has a placeholder", () => {
        expect(fillVersion("https://example.test/3/", undefined)).toBe("https://example.test/3/");
        expect(() => fillVersion("https://example.test/{version}/", undefined)).toThrow("No pinned version");
    });
});

describe("inventoryIds", () => {
    const ids = inventoryIds(
        "example",
        { title: "Example" },
        parseInventory(EXAMPLE_INVENTORY),
        "https://example.test/en/1.0/",
    );

    it("gives each Python object an id, titled with the package", () => {
        expect(ids["ext:example:example.models.GeneratedField"]).toEqual({
            href: "https://example.test/en/1.0/ref/models/fields/#example.models.GeneratedField",
            title: "Example: GeneratedField",
        });
    });

    it("names a member with its class, and keeps the first entry for a name", () => {
        expect(ids["ext:example:example.forms.Form.changed_data"]).toEqual({
            href: "https://example.test/en/1.0/ref/forms/api/#example.forms.Form.changed_data",
            title: "Example: Form.changed_data",
        });
    });

    it("gives settings their own form and skips other labels", () => {
        expect(ids["ext:example:setting:DEBUG"].href).toBe(
            "https://example.test/en/1.0/ref/settings/#std-setting-DEBUG",
        );
        expect(Object.keys(ids).some((id) => id.includes("some-label"))).toBe(false);
    });
});

describe("registryIds", () => {
    it("names a listed member with its class and anything else by its last segment", () => {
        const ids = registryIds("drf", {
            title: "DRF",
            links: {
                "rest_framework.generics.GenericAPIView.get_object": "https://drf.test/generic-views/#get_objectself",
                "rest_framework.fields.CharField": "https://drf.test/fields/#charfield",
            },
        });
        expect(ids["ext:drf:rest_framework.generics.GenericAPIView.get_object"].title).toBe(
            "DRF: GenericAPIView.get_object",
        );
        expect(ids["ext:drf:rest_framework.fields.CharField"].title).toBe("DRF: CharField");
    });
});

describe("checkRegistryLinks", () => {
    const config = {
        site: {
            title: "Site",
            links: {
                a: "https://site.test/page#present",
                b: "https://site.test/page#absent",
                c: "https://site.test/readme#heading",
                d: "https://site.test/gone",
            },
        },
    };
    const pages = {
        "https://site.test/page": '<h2 id="present">A</h2>',
        "https://site.test/readme": '<h2 id="user-content-heading">B</h2>',
    };

    it("reports a missing anchor and a failed page, and accepts GitHub's heading ids", async () => {
        let fetches = 0;
        const errors = await checkRegistryLinks(config, async (url) => {
            fetches += 1;
            if (!(url in pages)) {
                throw new Error("HTTP 404");
            }
            return pages[url];
        });
        expect(errors).toEqual([
            "https://site.test/page#absent: no element has this id",
            "https://site.test/gone: HTTP 404",
        ]);
        expect(fetches).toBe(3);
    });
});

describe("ExternalDocsExtractor", () => {
    it("writes inventory and registry ids at the pinned version", async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), "external-docs-"));
        const configPath = path.join(dir, "external-docs.json");
        const lockPath = path.join(dir, "uv.lock");
        const outputPath = path.join(dir, "out", "external-ids.json");
        await writeFile(
            configPath,
            JSON.stringify({
                example: { title: "Example", lockPackage: "example", base: "https://example.test/en/{minor}/" },
                site: { title: "Site", links: { thing: "https://site.test/page#thing" } },
            }),
        );
        await writeFile(lockPath, '[[package]]\nname = "example"\nversion = "1.2.3"\n');

        const requested = [];
        const extractor = new ExternalDocsExtractor({
            fetchInventory: async (url) => {
                requested.push(url);
                return EXAMPLE_INVENTORY;
            },
            fetchPage: async () => '<a id="thing"></a>',
            findInstalledVersions: async () => ({ example: null }),
        });
        await extractor.extract({ outputPath, configPath, lockPath });

        expect(requested).toEqual(["https://example.test/en/1.2/objects.inv"]);
        const ids = JSON.parse(await readFile(outputPath, "utf-8"));
        expect(ids["ext:example:example.models.GeneratedField"].href).toBe(
            "https://example.test/en/1.2/ref/models/fields/#example.models.GeneratedField",
        );
        expect(ids["ext:site:thing"]).toEqual({ href: "https://site.test/page#thing", title: "Site: thing" });
    });

    it("links the version installed in the docs environment over the lockfile's", async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), "external-docs-"));
        const configPath = path.join(dir, "external-docs.json");
        const lockPath = path.join(dir, "uv.lock");
        await writeFile(
            configPath,
            JSON.stringify({
                example: { title: "Example", lockPackage: "example", base: "https://example.test/en/{minor}/" },
            }),
        );
        // The lockfile pins 6.1 for newer Pythons, but this environment runs 5.2.
        await writeFile(lockPath, '[[package]]\nname = "example"\nversion = "6.1"\n');

        const requested = [];
        const extractor = new ExternalDocsExtractor({
            fetchInventory: async (url) => {
                requested.push(url);
                return EXAMPLE_INVENTORY;
            },
            findInstalledVersions: async (names) => {
                expect(names).toEqual(["example"]);
                return { example: "5.2.17" };
            },
        });
        await extractor.extract({ outputPath: path.join(dir, "ids.json"), configPath, lockPath });

        expect(requested).toEqual(["https://example.test/en/5.2/objects.inv"]);
    });

    it("fails when a hand-listed link is broken", async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), "external-docs-"));
        const configPath = path.join(dir, "external-docs.json");
        const lockPath = path.join(dir, "uv.lock");
        await writeFile(
            configPath,
            JSON.stringify({ site: { title: "Site", links: { thing: "https://site.test/p#x" } } }),
        );
        await writeFile(lockPath, "");
        const extractor = new ExternalDocsExtractor({
            fetchPage: async () => "<p></p>",
            findInstalledVersions: async () => ({}),
        });
        await expect(
            extractor.extract({ outputPath: path.join(dir, "ids.json"), configPath, lockPath }),
        ).rejects.toThrow("https://site.test/p#x: no element has this id");
    });
});

describe("cachedFetch", () => {
    const ok = (text) => async () => new Response(text, { status: 200 });
    const offline = async () => {
        throw new TypeError("fetch failed");
    };

    it("keeps a fetched copy and returns it when the network fails", async () => {
        const cacheDir = await mkdtemp(path.join(os.tmpdir(), "external-cache-"));
        const warnings = [];
        const warn = (message) => warnings.push(message);

        expect((await cachedFetch("https://site.test/a", { cacheDir, fetchImpl: ok("fresh"), warn })).toString()).toBe(
            "fresh",
        );
        expect((await cachedFetch("https://site.test/a", { cacheDir, fetchImpl: offline, warn })).toString()).toBe(
            "fresh",
        );
        expect(warnings).toEqual(["Using the cached copy of https://site.test/a: fetch failed"]);
    });

    it("explains how to fill the cache when the network fails and nothing is cached", async () => {
        const cacheDir = await mkdtemp(path.join(os.tmpdir(), "external-cache-"));
        await expect(cachedFetch("https://site.test/b", { cacheDir, fetchImpl: offline })).rejects.toThrow(
            "no cached copy exists",
        );
    });

    it("fails on an HTTP error status even when a copy is cached", async () => {
        const cacheDir = await mkdtemp(path.join(os.tmpdir(), "external-cache-"));
        await cachedFetch("https://site.test/c", { cacheDir, fetchImpl: ok("fresh") });
        const gone = async () => new Response("", { status: 404 });
        await expect(cachedFetch("https://site.test/c", { cacheDir, fetchImpl: gone })).rejects.toThrow("HTTP 404");
    });
});

describe("installedVersions", () => {
    let tempDir;
    let originalPath;

    beforeEach(async () => {
        tempDir = await mkdtemp(path.join(os.tmpdir(), "external-installed-"));
        originalPath = process.env.PATH;
        // Run the lookup script with the system Python instead of a synced uv environment,
        // and install a package by placing its metadata on the import path.
        await writeFile(
            path.join(tempDir, "uv"),
            `#!/bin/sh
[ "$1 $2 $3" = "run --no-sync python" ] || exit 64
shift 3
PYTHONPATH="${tempDir}" exec python3 "$@"
`,
            { mode: 0o755 },
        );
        const distInfo = path.join(tempDir, "vueda_installed-1.2.3.dist-info");
        await mkdir(distInfo);
        await writeFile(
            path.join(distInfo, "METADATA"),
            "Metadata-Version: 2.1\nName: vueda-installed\nVersion: 1.2.3\n",
        );
        process.env.PATH = tempDir + path.delimiter + originalPath;
    });

    afterEach(async () => {
        process.env.PATH = originalPath;
        await rm(tempDir, { recursive: true, force: true });
    });

    it("reports an installed package's version and null for one that is not installed", async () => {
        const versions = await installedVersions(["vueda-installed", "vueda-no-such-package"]);
        expect(versions).toEqual({ "vueda-installed": "1.2.3", "vueda-no-such-package": null });
    });

    it("reports null for every package when the lookup fails", async () => {
        await writeFile(path.join(tempDir, "uv"), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
        const versions = await installedVersions(["vueda-installed"]);
        expect(versions).toEqual({ "vueda-installed": null });
    });
});
