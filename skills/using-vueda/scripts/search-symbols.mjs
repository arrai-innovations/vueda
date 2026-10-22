#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const help = `Usage: node search-symbols.mjs --major <major> [--language js|py|vue|rest|theme] [--limit 1..50] <query>

Search documented VUEDA identifiers and return Markdown URLs as JSON.
Requires Node.js 22 or newer and access to https://vueda.dev.
Use -- before queries that start with a dash, such as CSS custom properties.
`;
const languages = {
    js: ["js"],
    py: ["py"],
    vue: ["vue"],
    rest: ["rest"],
    theme: ["theming", "theme-key", "css-token"],
};

/** Rank exact identifiers and names before prefixes and other partial matches. */
export function searchSymbols(symbols, query, { language, limit = 10 } = {}) {
    const needle = query.toLowerCase();
    const terms = needle.split(/\s+/);
    const ranked = [];
    for (const symbol of symbols) {
        if (language && !languages[language].includes(symbol.id.split(":")[0])) {
            continue;
        }
        const id = symbol.id.toLowerCase();
        const name = symbol.name.toLowerCase();
        if (!terms.every((term) => `${name} ${id}`.includes(term))) {
            continue;
        }
        const shortName = name.split(".").at(-1);
        const exactOrPrefix = [
            symbol.id === query,
            symbol.name === query,
            id === needle,
            name === needle,
            shortName === needle,
            name.startsWith(needle) || shortName.startsWith(needle),
        ];
        const rank = exactOrPrefix.indexOf(true);
        ranked.push({ symbol, rank: rank < 0 ? exactOrPrefix.length : rank });
    }
    ranked.sort(
        (a, b) =>
            a.rank - b.rank || a.symbol.name.localeCompare(b.symbol.name) || a.symbol.id.localeCompare(b.symbol.id),
    );
    return { total: ranked.length, matches: ranked.slice(0, limit).map(({ symbol }) => symbol) };
}

export async function main(args) {
    const { values, positionals } = parseArgs({
        args,
        allowPositionals: true,
        options: {
            major: { type: "string" },
            language: { type: "string" },
            limit: { type: "string", default: "10" },
            help: { type: "boolean", short: "h" },
        },
    });
    if (values.help) {
        return help;
    }
    if (!/^[1-9]\d*$/.test(values.major || "") || !Number.isSafeInteger(Number(values.major))) {
        throw new Error("Provide the application's major version with --major <positive integer>.");
    }
    if (values.language && !Object.hasOwn(languages, values.language)) {
        throw new Error("--language must be js, py, vue, rest, or theme.");
    }
    const limit = Number(values.limit);
    if (!/^\d+$/.test(values.limit) || !Number.isInteger(limit) || limit < 1 || limit > 50) {
        throw new Error("--limit must be an integer from 1 to 50.");
    }
    const query = positionals.join(" ").trim();
    if (!query) {
        throw new Error("Provide a symbol name or qualified identifier to search for.");
    }
    const base = `https://vueda.dev/v${values.major}/`;
    const indexUrl = `${base}symbols.json`;
    let index;
    try {
        const response = await fetch(indexUrl, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        index = await response.json();
    } catch (error) {
        throw new Error(
            `Could not load ${indexUrl}: ${error.message}. Follow ${base}llms.txt and its reference indexes instead.`,
        );
    }
    if (
        index?.version !== 1 ||
        !Array.isArray(index.symbols) ||
        !index.symbols.every(
            (symbol) =>
                symbol &&
                typeof symbol.id === "string" &&
                typeof symbol.name === "string" &&
                typeof symbol.url === "string" &&
                symbol.url.startsWith(base),
        )
    ) {
        throw new Error(
            `Unsupported or invalid symbol index at ${indexUrl}. Follow ${base}llms.txt and its reference indexes instead.`,
        );
    }
    const { total, matches } = searchSymbols(index.symbols, query, { language: values.language, limit });
    return JSON.stringify(
        { query, major: Number(values.major), indexUrl, total, truncated: total > matches.length, matches },
        null,
        2,
    );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main(process.argv.slice(2)).then(
        (output) => console.log(output),
        (error) => {
            console.error(error.message);
            process.exitCode = 1;
        },
    );
}
