import { ConfigurationNormalizer } from "../../../js/normalizers/configuration.js";
import { renderConfigurationBundle } from "../../../js/renderers/configuration.js";
import Ajv2020 from "ajv/dist/2020.js";
import MarkdownIt from "markdown-it";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function payload() {
    const context = {
        source: { file: "server/vueda/core/default_settings.py", line: 10 },
        function: "get_defaults",
        conditions: [],
    };
    return {
        config: [{ name: "EMAIL", accessor: "__call__", default: null, ...context }],
        definitions: [
            {
                name: "MAILERS",
                path: ["MAILERS"],
                expression: "{'default': {'BACKEND': email_backend}}",
                operation: "=",
                ...context,
                conditions: ["use_mailers"],
            },
        ],
        reads: [
            { name: "EXTERNAL", fallback: "None", access: "getattr", source: { file: "server/vueda/use.py", line: 2 } },
        ],
        metadata: {
            config: { EMAIL: { description: "Email backend.", settings: ["MAILERS.default.BACKEND"] } },
            settings: {
                MAILERS: { configKey: "EMAIL", description: "Mailer configuration." },
                EXTERNAL: { description: "External setting." },
            },
            djangoExemptions: {},
        },
    };
}
const normalize = (data) => new ConfigurationNormalizer().normalize(data);

describe("configuration documentation completeness", () => {
    it("joins config mappings, factory variants, and external reads", () => {
        const result = normalize(payload());
        const schema = JSON.parse(
            readFileSync(new URL("../../../schema/canonical.schema.json", import.meta.url), "utf8"),
        );
        const validate = new Ajv2020({ strict: false }).compile(schema);
        expect(validate(result), JSON.stringify(validate.errors)).toBe(true);
        expect(result.config[0].reads[0].default).toBeNull();
        expect(result.settings.map((entry) => entry.name)).toEqual(["EXTERNAL", "MAILERS"]);
        expect(result.settings[1].definitions[0].conditions).toEqual(["use_mailers"]);
        expect(result.settings[0].reads[0].fallback).toBe("None");
    });

    it.each([
        [
            "new config key",
            (data) => {
                data.config.push({ ...data.config[0], name: "NEW" });
            },
            "missing config key: NEW",
        ],
        [
            "new settings read",
            (data) => {
                data.reads.push({ ...data.reads[0], name: "NEW" });
            },
            "missing Django setting: NEW",
        ],
        [
            "stale config entry",
            (data) => {
                data.metadata.config.REMOVED = data.metadata.config.EMAIL;
            },
            "stale config key REMOVED",
        ],
        [
            "stale setting entry",
            (data) => {
                data.metadata.settings.REMOVED = { description: "Old." };
            },
            "stale Django setting REMOVED",
        ],
        [
            "empty description",
            (data) => {
                data.metadata.config.EMAIL.description = " ";
            },
            "EMAIL description",
        ],
        [
            "unknown mapping",
            (data) => {
                data.metadata.config.EMAIL.settings = ["TYPO"];
            },
            "unknown setting TYPO",
        ],
        [
            "missing condition explanation",
            (data) => {
                data.config[0].conditions = ["backend == 'mailgun'"];
            },
            "EMAIL conditional requirement",
        ],
        [
            "empty exemption",
            (data) => {
                delete data.metadata.settings.EXTERNAL;
                data.metadata.djangoExemptions.EXTERNAL = "";
            },
            "Django exemption EXTERNAL",
        ],
        [
            "conflicting exemption",
            (data) => {
                data.metadata.djangoExemptions.EXTERNAL = "Standard Django behavior.";
            },
            "conflicting Django exemption",
        ],
        [
            "wrong config link",
            (data) => {
                data.metadata.settings.EXTERNAL = { configKey: "EMAIL" };
            },
            "EMAIL does not supply EXTERNAL",
        ],
    ])("rejects %s", (_name, mutate, message) => {
        const data = payload();
        mutate(data);
        expect(() => normalize(data)).toThrow(message);
    });

    it("allows explicit Django exemptions but still requires config documentation", () => {
        const data = payload();
        delete data.metadata.settings.EXTERNAL;
        data.metadata.djangoExemptions.EXTERNAL = "Standard Django behavior.";
        expect(normalize(data).djangoExemptions).toEqual([{ name: "EXTERNAL", reason: "Standard Django behavior." }]);
        delete data.metadata.config.EMAIL;
        expect(() => normalize(data)).toThrow("missing config key: EMAIL");
    });
});

describe("configuration reference rendering", () => {
    it("keeps required keys, literal None defaults, scopes, mappings, and fallbacks distinct", () => {
        const data = payload();
        data.config.push({
            ...data.config[0],
            default: "None",
            function: "get_production_defaults",
            conditions: ["enabled"],
        });
        data.metadata.config.EMAIL.when = "When the backend is enabled.";
        const outputs = renderConfigurationBundle(normalize(data));
        expect([...outputs.keys()]).toEqual(["configuration.md"]);
        const page = outputs.get("configuration.md");
        expect(page).toContain("Required when read");
        expect(page).toContain("Production defaults; `enabled`");
        expect(page).toContain("When the backend is enabled.");
        expect(page).toContain("MAILERS.default.BACKEND");
        expect(page).toContain("{#config-email}");
        expect(page).toContain("[`EMAIL`](#config-email)");
        expect(page).toContain("Local fallback values: `None`");
        expect(page).toContain("server/vueda/use.py:2");
        expect(page).toContain("The defaults factories do not set this Django setting.");
    });

    it("does not mark an existence check as a required setting", () => {
        const data = payload();
        data.reads[0] = { ...data.reads[0], access: "hasattr", fallback: null };
        const page = renderConfigurationBundle(normalize(data)).get("configuration.md");
        expect(page).toContain("checks whether this setting exists");
        expect(page).not.toContain("The setting must exist");
    });

    it("renders defaults and None values as escaped code inside Markdown tables", () => {
        const data = payload();
        data.config[0].default = "'<value> | `quoted`'";
        const page = renderConfigurationBundle(normalize(data)).get("configuration.md");
        const html = new MarkdownIt().render(page);
        expect(html).toContain("&lt;value&gt; | `quoted`");
        expect(html).not.toContain("<value>");
        expect(page).toContain("\\|");
    });
});
