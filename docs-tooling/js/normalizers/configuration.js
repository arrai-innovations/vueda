import { Normalizer } from "../core.js";

function groupByName(records) {
    const groups = new Map();
    for (const record of records) {
        if (!groups.has(record.name)) {
            groups.set(record.name, []);
        }
        groups.get(record.name).push(record);
    }
    return groups;
}

function requireText(value, label) {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`Configuration documentation: ${label} must be nonempty text`);
    }
}

/** Join the discovered inventory with authored meaning, rejecting missing and stale entries. */
export class ConfigurationNormalizer extends Normalizer {
    normalize(payload) {
        const configReads = groupByName(payload.config);
        const settingReads = groupByName(payload.reads);
        const definitions = groupByName(payload.definitions);
        const { config, settings, djangoExemptions } = payload.metadata;
        const knownSettings = new Set([...definitions.keys(), ...settingReads.keys()]);

        for (const name of configReads.keys()) {
            if (!Object.hasOwn(config, name)) {
                throw new Error(`Configuration documentation missing config key: ${name}`);
            }
        }
        for (const name of settingReads.keys()) {
            if (!Object.hasOwn(settings, name) && !Object.hasOwn(djangoExemptions, name)) {
                throw new Error(`Configuration documentation missing Django setting: ${name}`);
            }
        }
        for (const [name, reason] of Object.entries(djangoExemptions)) {
            requireText(reason, `Django exemption ${name}`);
            if (!settingReads.has(name) || Object.hasOwn(settings, name)) {
                throw new Error(`Configuration documentation: stale or conflicting Django exemption ${name}`);
            }
        }

        const configEntries = Object.entries(config)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, entry]) => {
                if (!configReads.has(name)) {
                    throw new Error(`Configuration documentation: stale config key ${name}`);
                }
                requireText(entry.description, `${name} description`);
                if (!Array.isArray(entry.settings) || !entry.settings.length) {
                    throw new Error(`Configuration documentation: ${name} needs a Django setting mapping`);
                }
                for (const target of entry.settings) {
                    if (typeof target !== "string" || !knownSettings.has(target.split(".")[0])) {
                        throw new Error(`Configuration documentation: ${name} maps to unknown setting ${target}`);
                    }
                }
                const reads = configReads.get(name);
                if (reads.some((read) => read.conditions.length)) {
                    requireText(entry.when, `${name} conditional requirement`);
                }
                return {
                    name,
                    description: entry.description,
                    settings: entry.settings,
                    when: entry.when || null,
                    reads,
                };
            });

        const settingEntries = Object.entries(settings)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, entry]) => {
                if (!knownSettings.has(name)) {
                    throw new Error(`Configuration documentation: stale Django setting ${name}`);
                }
                const configEntry = entry.configKey ? config[entry.configKey] : null;
                if (entry.configKey && !configEntry) {
                    throw new Error(
                        `Configuration documentation: ${name} links to unknown config key ${entry.configKey}`,
                    );
                }
                if (configEntry && !configEntry.settings.some((target) => target.split(".")[0] === name)) {
                    throw new Error(`Configuration documentation: ${entry.configKey} does not supply ${name}`);
                }
                const description = entry.description || configEntry?.description;
                requireText(description, `${name} description`);
                return {
                    name,
                    description,
                    configKey: entry.configKey || null,
                    definitions: definitions.get(name) || [],
                    reads: settingReads.get(name) || [],
                };
            });

        return {
            schemaVersion: "1.0.0",
            source: "configuration",
            config: configEntries,
            settings: settingEntries,
            djangoExemptions: Object.entries(djangoExemptions).map(([name, reason]) => ({ name, reason })),
        };
    }
}
