/**
 * Normalize raw theme-keys extraction into the canonical theme-keys bundle.
 *
 * Output shape:
 *   {
 *     kind: "theme-keys",
 *     entries: [{
 *       name, isMetaKey, description, source: { file, line },
 *       slots: [{ name, isFunction, composes, rawClasses, source }],
 *       composedBy: [{ consumer, slot, condition }]
 *     }]
 *   }
 *
 * `composedBy` is the reverse index built by walking every slot's `composes`
 * array. A reference like "_X.root" inside `<entry>.<slot>` contributes
 * { consumer: <entry>, slot: <slot>, condition: null } to entries[_X].composedBy.
 */
import { Normalizer } from "../core.js";

function parseComposeRef(ref) {
    // "_ButtonGhost.root" -> { target: "_ButtonGhost", slot: "root" }
    const idx = ref.indexOf(".");
    if (idx <= 0) return null;
    return { target: ref.slice(0, idx), slot: ref.slice(idx + 1) };
}

export class ThemeKeysNormalizer extends Normalizer {
    normalize(payload) {
        const inputEntries = (payload?.entries || []).map((entry) => ({
            name: entry.name,
            isMetaKey: !!entry.isMetaKey,
            description: entry.description ?? null,
            source: entry.source || { file: "", line: 0 },
            slots: (entry.slots || []).map((slot) => ({
                name: slot.name,
                isFunction: !!slot.isFunction,
                composes: Array.isArray(slot.composes) ? [...slot.composes] : [],
                rawClasses: Array.isArray(slot.rawClasses) ? [...slot.rawClasses] : [],
                source: slot.source || { file: "", line: 0 },
            })),
            composedBy: [],
        }));

        const byName = new Map();
        for (const entry of inputEntries) {
            byName.set(entry.name, entry);
        }

        for (const entry of inputEntries) {
            for (const slot of entry.slots) {
                for (const ref of slot.composes) {
                    const parsed = parseComposeRef(ref);
                    if (!parsed) continue;
                    const target = byName.get(parsed.target);
                    if (!target) continue;
                    target.composedBy.push({
                        consumer: entry.name,
                        slot: slot.name,
                        condition: null,
                    });
                }
            }
        }

        return {
            kind: "theme-keys",
            entries: inputEntries,
        };
    }
}
