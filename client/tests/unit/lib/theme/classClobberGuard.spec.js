/**
 * Guard against a theme-authoring footgun.
 *
 * Theme `class` arrays are flattened by `combineClasses`, which has no
 * tailwind-merge: when the array contains conditional objects it builds a flat
 * `{ token: boolean }` map with LAST-WRITE-WINS per token, splitting compound
 * keys. So if the same utility token appears in more than one branch of a
 * variant/size/align object, an inactive branch's `false` silently clears the
 * token an active branch (or an unconditional string) set to `true`. Vue's own
 * array-class binding would keep it (union semantics); combineClasses drops it.
 *
 * That divergence is the bug class behind several control-theme issues (e.g. a
 * default sidebar menu button losing its hover background). This test resolves
 * every registered slot across a grid of prop values and fails if any token
 * that the union would render is dropped by the real `combineClasses`.
 *
 * Authoring rule this enforces: a utility token appears exactly once across a
 * slot's class array. A token common to several branches must be hoisted to its
 * own (or an unconditional) entry, never repeated in mutually-exclusive keys.
 */
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import { beforeAll, describe, expect, it, vi } from "vitest";

// Capture each raw partialTheme BEFORE patchTheme combines it, by mocking the
// registry. vi.hoisted so the array exists when the hoisted mock factory runs.
const { captured } = vi.hoisted(() => ({ captured: [] }));
vi.mock("@vueda/use/themeRegistry.js", () => ({
    patchTheme: (partial) => captured.push(partial),
    setTheme: () => {},
    getTheme: () => ({}),
    mergeTheme: (...themes) => themes[0],
    defaultTheme: { value: {} },
}));

// Lazily glob every theme module. The vitest setup pre-imports the library, so
// these modules are already cached with the real registry; vi.resetModules()
// (in beforeAll) drops that cache so re-importing re-runs each patchTheme
// through the mock, leaving `captured` with every slot's raw class array.
const themeModules = import.meta.glob("../../../../lib/theme/vueda-tailwind/**/*.theme.js");

const tokens = (s) => String(s).split(/\s+/).filter(Boolean);

const flatten = (cls, out = []) => {
    if (cls == null) return out;
    if (typeof cls === "string") out.push(cls);
    else if (Array.isArray(cls)) cls.forEach((c) => flatten(c, out));
    else if (typeof cls === "object") out.push(cls);
    return out;
};

// Vue array-binding semantics: a token is present if ANY occurrence is truthy.
const unionSet = (entries) => {
    const s = new Set();
    for (const e of entries) {
        if (typeof e === "string") tokens(e).forEach((t) => s.add(t));
        else for (const [k, v] of Object.entries(e)) if (v) tokens(k).forEach((t) => s.add(t));
    }
    return s;
};

// What combineClasses (the real renderer) actually emits.
const actualSet = (entries) => {
    const out = combineClasses(...entries);
    const s = new Set();
    if (typeof out === "string") tokens(out).forEach((t) => s.add(t));
    else for (const [k, v] of Object.entries(out)) if (v) tokens(k).forEach((t) => s.add(t));
    return s;
};

// Discover the prop keys a slot reads and plausible values for each: string
// props (compared with === "literal") take those literals; everything else is
// treated as boolean.
const candidateArgs = (fns) => {
    const accessed = new Set();
    const probe = new Proxy(
        {},
        {
            get(_t, k) {
                if (typeof k === "string") accessed.add(k);
                return undefined;
            },
        },
    );
    for (const fn of fns) {
        try {
            fn(probe);
        } catch {
            /* missing nested props are fine for discovery */
        }
    }
    const src = fns.map((f) => f.toString()).join("\n");
    const cands = {};
    for (const key of accessed) {
        const lits = new Set();
        const re = new RegExp(`["']([^"']+)["']\\s*===\\s*\\b${key}\\b|\\b${key}\\b\\s*===\\s*["']([^"']+)["']`, "g");
        let m;
        while ((m = re.exec(src))) lits.add(m[1] ?? m[2]);
        cands[key] = lits.size ? [undefined, ...lits] : [undefined, false, true];
    }
    return cands;
};

function* combos(cands) {
    const keys = Object.keys(cands);
    if (!keys.length) {
        yield {};
        return;
    }
    const idx = keys.map(() => 0);
    while (true) {
        yield Object.fromEntries(keys.map((k, i) => [k, cands[k][idx[i]]]));
        let p = keys.length - 1;
        while (p >= 0) {
            if (++idx[p] < cands[keys[p]].length) break;
            idx[p--] = 0;
        }
        if (p < 0) break;
    }
}

const resolveClass = (slotDef, args) => {
    let def = slotDef;
    if (typeof def === "function") def = def(args);
    let cls = def?.class;
    if (typeof cls === "function") cls = cls(args);
    return cls;
};

describe("lib/theme/vueda-tailwind class-clobber guard", () => {
    beforeAll(async () => {
        // Drop the setup-cached theme modules (vi.mock survives a reset), then
        // re-import each so its patchTheme(mock) side effect captures raw arrays.
        vi.resetModules();
        await Promise.all(Object.values(themeModules).map((load) => load()));
    });

    it("no slot drops a token that union semantics would keep", () => {
        expect(captured.length).toBeGreaterThan(0);

        const findings = [];
        for (const partial of captured) {
            for (const [comp, slots] of Object.entries(partial)) {
                if (!slots || typeof slots !== "object") continue;
                for (const [slotName, slotDef] of Object.entries(slots)) {
                    const fns = [];
                    if (typeof slotDef === "function") fns.push(slotDef);
                    if (slotDef && typeof slotDef === "object" && typeof slotDef.class === "function") {
                        fns.push(slotDef.class);
                    }
                    const cands = candidateArgs(fns);
                    let n = 0;
                    for (const args of combos(cands)) {
                        if (++n > 5000) break;
                        let entries;
                        try {
                            entries = flatten(resolveClass(slotDef, args));
                        } catch {
                            continue;
                        }
                        if (!entries.some((e) => typeof e === "object")) continue;
                        const dropped = [...unionSet(entries)].filter((t) => !actualSet(entries).has(t));
                        if (dropped.length) {
                            const a = Object.fromEntries(Object.entries(args).filter(([, v]) => v !== undefined));
                            findings.push(`${comp}.${slotName} ${JSON.stringify(a)} drops: ${dropped.join(", ")}`);
                        }
                    }
                }
            }
        }

        expect(findings, `combineClasses dropped tokens the theme set as truthy:\n${findings.join("\n")}`).toEqual([]);
    });
});
