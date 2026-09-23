/**
 * Normalize raw theme-keys extraction into the canonical theme-keys bundle.
 *
 * The raw payload is a flat list of one entry per slot. The normalizer groups
 * those entries into families, then components, then slots:
 *
 *   {
 *     schemaVersion: "1.0",
 *     source: "theme-keys",
 *     families: [
 *       {
 *         name, sourceFile,
 *         components: [
 *           {
 *             name, kind, group, description,
 *             slots: [
 *               {
 *                 id: "theme-key:<Component>.<slot>",
 *                 name, kind, valueShape,
 *                 defaultClasses: [string] | null,
 *                 callbackSource: string | null,
 *                 composes: [string],
 *                 description, group, source,
 *               }
 *             ]
 *           }
 *         ]
 *       }
 *     ]
 *   }
 */
import { Normalizer } from "../core.js";

function slotId(component, slot) {
    return `theme-key:${component}.${slot}`;
}

export class ThemeKeysNormalizer extends Normalizer {
    normalize(payload) {
        const rawEntries = payload?.entries || [];
        const sourceFileByFamily = new Map();
        for (const src of payload?.sources || []) {
            const parts = src.split("/");
            const idx = parts.indexOf("vueda-tailwind");
            const family = idx >= 0 && idx + 1 < parts.length - 1 ? parts[idx + 1] : parts[parts.length - 2] || "";
            if (family && !sourceFileByFamily.has(family)) {
                sourceFileByFamily.set(family, src);
            }
        }

        // Group entries first by family (preserving encounter order), then by
        // component within each family, then collect their slots.
        const familyOrder = [];
        const familyMap = new Map();

        for (const entry of rawEntries) {
            const familyName = entry.family || "";
            if (!familyMap.has(familyName)) {
                familyMap.set(familyName, { componentOrder: [], componentMap: new Map() });
                familyOrder.push(familyName);
            }
            const fam = familyMap.get(familyName);

            if (!fam.componentMap.has(entry.component)) {
                fam.componentOrder.push(entry.component);
                fam.componentMap.set(entry.component, {
                    name: entry.component,
                    kind: entry.kind,
                    group: entry.group || null,
                    description: entry.description || null,
                    slots: [],
                });
            }
            const comp = fam.componentMap.get(entry.component);

            // First-encountered group/description wins for the component
            // (the component-level description is whatever annotated the
            // banner-introduced component key).
            if (!comp.group && entry.group) {
                comp.group = entry.group;
            }

            const callbackSource = entry.callbackSource ?? null;
            const defaultClasses = Array.isArray(entry.staticClass) ? entry.staticClass : null;
            const composes = Array.isArray(entry.composes) ? [...entry.composes] : [];

            comp.slots.push({
                id: slotId(entry.component, entry.slot),
                name: entry.slot,
                kind: entry.kind,
                valueShape: entry.valueShape || (callbackSource ? "callback" : "static"),
                defaultClasses,
                callbackSource,
                composes,
                description: entry.description || null,
                group: entry.group || null,
                source: entry.source || { file: "", line: 0, column: 0 },
            });
        }

        const families = familyOrder.map((familyName) => {
            const fam = familyMap.get(familyName);
            return {
                name: familyName,
                sourceFile: sourceFileByFamily.get(familyName) || null,
                components: fam.componentOrder.map((cn) => fam.componentMap.get(cn)),
            };
        });

        return {
            schemaVersion: "1.0",
            source: "theme-keys",
            families,
        };
    }
}
