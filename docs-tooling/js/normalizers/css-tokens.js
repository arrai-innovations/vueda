/**
 * Normalize raw CSS tokens extraction into the canonical css-tokens bundle.
 *
 * Output shape:
 *   {
 *     kind: "css-tokens",
 *     tokens: [{
 *       name, value, group, description, source: { file, line, column },
 *       scope: "root" | "dark",
 *       variants: { light?, dark? },
 *       themeMapping: { utility, property } | null
 *     }],
 *     groups: [{ name, description }]
 *   }
 */
import { Normalizer } from "../core.js";

function selectPrimaryRecord(rootRecord, darkRecord) {
    return rootRecord || darkRecord;
}

export class CssTokensNormalizer extends Normalizer {
    normalize(payload) {
        const rootDecls = (payload?.scopes?.root || []).slice();
        const darkDecls = (payload?.scopes?.dark || []).slice();
        const themeMapping = payload?.themeMapping || {};

        const rootByName = new Map();
        for (const decl of rootDecls) {
            rootByName.set(decl.name, decl);
        }
        const darkByName = new Map();
        for (const decl of darkDecls) {
            darkByName.set(decl.name, decl);
        }

        const allNames = new Set([...rootByName.keys(), ...darkByName.keys()]);
        const tokens = [];
        const groupOrder = [];
        const groupSeen = new Set();

        // Preserve declaration order from :root, then .dark for any extras.
        const orderedNames = [];
        const orderedSeen = new Set();
        for (const decl of rootDecls) {
            if (!orderedSeen.has(decl.name)) {
                orderedSeen.add(decl.name);
                orderedNames.push(decl.name);
            }
        }
        for (const decl of darkDecls) {
            if (!orderedSeen.has(decl.name)) {
                orderedSeen.add(decl.name);
                orderedNames.push(decl.name);
            }
        }

        for (const name of orderedNames) {
            if (!allNames.has(name)) continue;
            const rootRec = rootByName.get(name);
            const darkRec = darkByName.get(name);
            const primary = selectPrimaryRecord(rootRec, darkRec);
            // Strip the leading "--" for mapping lookups (themeMapping keys
            // are stored without the prefix).
            const bareName = name.replace(/^--/, "");
            const mapping = themeMapping[bareName] || null;

            const variants = {};
            if (rootRec) variants.light = rootRec.value;
            if (darkRec) variants.dark = darkRec.value;

            const description =
                primary.description || (rootRec && rootRec.description) || (darkRec && darkRec.description) || null;

            const groupName = primary.group || "Base";
            if (!groupSeen.has(groupName)) {
                groupSeen.add(groupName);
                groupOrder.push(groupName);
            }

            tokens.push({
                name,
                value: primary.value,
                group: groupName,
                description,
                source: primary.source,
                scope: rootRec ? "root" : "dark",
                variants,
                themeMapping: mapping,
            });
        }

        const groups = groupOrder.map((name) => ({ name, description: null }));

        return {
            kind: "css-tokens",
            tokens,
            groups,
        };
    }
}
