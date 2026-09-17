/**
 * Helpers for guards that resolve every registered theme slot across plausible prop values.
 * Shared by the class-clobber and hairline-border guards in tests/unit/lib/theme/.
 */

export const tokens = (s) => String(s).split(/\s+/).filter(Boolean);

export const flatten = (cls, out = []) => {
    if (cls == null) return out;
    if (typeof cls === "string") out.push(cls);
    else if (Array.isArray(cls)) cls.forEach((c) => flatten(c, out));
    else if (typeof cls === "object") out.push(cls);
    return out;
};

// Discover the prop keys a slot reads and plausible values for each: string
// props (compared with === "literal") take those literals; everything else is
// treated as boolean.
export const candidateArgs = (fns) => {
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

export function* combos(cands) {
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

export const resolveClass = (slotDef, args) => {
    let def = slotDef;
    if (typeof def === "function") def = def(args);
    let cls = def?.class;
    if (typeof cls === "function") cls = cls(args);
    return cls;
};
