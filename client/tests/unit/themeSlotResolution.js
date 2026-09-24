/**
 * Helpers for guards that resolve every registered theme slot across plausible prop values.
 * Shared by the class-clobber and hairline-border guards in tests/unit/lib/theme/.
 */

export const tokens = (s) => String(s).split(/\s+/).filter(Boolean);

export const flatten = (cls, out = []) => {
    if (cls == null) {
        return out;
    }
    if (typeof cls === "string") {
        out.push(cls);
    } else if (Array.isArray(cls)) {
        cls.forEach((c) => flatten(c, out));
    } else if (typeof cls === "object") {
        out.push(cls);
    }
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
                if (typeof k === "string") {
                    accessed.add(k);
                }
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
        while ((m = re.exec(src))) {
            lits.add(m[1] ?? m[2]);
        }
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
            if (++idx[p] < cands[keys[p]].length) {
                break;
            }
            idx[p--] = 0;
        }
        if (p < 0) {
            break;
        }
    }
}

export const resolveClass = (slotDef, args) => {
    let def = slotDef;
    if (typeof def === "function") {
        def = def(args);
    }
    let cls = def?.class;
    if (typeof cls === "function") {
        cls = cls(args);
    }
    return cls;
};

// The utility a class token applies, with variant prefixes (`hover:`, `data-[x]:`, `[&>*]:`)
// and the important flag removed. A colon inside brackets belongs to the variant, so a
// selector reference such as `[.border-b]:pb-6` resolves to `pb-6`.
export const utilityOf = (token) => {
    let depth = 0;
    let start = 0;
    for (let i = 0; i < token.length; i++) {
        const c = token[i];
        if (c === "[") {
            depth++;
        } else if (c === "]") {
            depth--;
        } else if (c === ":" && depth === 0) {
            start = i + 1;
        }
    }
    return token.slice(start).replace(/^!|!$/g, "");
};

// Every token a slot can render across the prop grid, from strings and conditional keys alike.
export const slotTokens = (slotDef) => {
    const fns = [];
    if (typeof slotDef === "function") {
        fns.push(slotDef);
    }
    if (slotDef && typeof slotDef === "object" && typeof slotDef.class === "function") {
        fns.push(slotDef.class);
    }
    const all = new Set();
    let n = 0;
    for (const args of combos(candidateArgs(fns))) {
        if (++n > 5000) {
            break;
        }
        let entries;
        try {
            entries = flatten(resolveClass(slotDef, args));
        } catch {
            continue;
        }
        for (const e of entries) {
            if (typeof e === "string") {
                tokens(e).forEach((t) => all.add(t));
            } else {
                for (const k of Object.keys(e)) {
                    tokens(k).forEach((t) => all.add(t));
                }
            }
        }
    }
    return [...all];
};

// Walk a component entry down to its slot definitions, following nested slot groups such as
// `ObjectsGrid.rowActions.action` and local `themeOverride` maps.
export function* slotDefs(entry, path) {
    if (typeof entry === "function" || (entry && typeof entry === "object" && "class" in entry)) {
        yield [path, entry];
        return;
    }
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        for (const [key, child] of Object.entries(entry)) {
            yield* slotDefs(child, `${path}.${key}`);
        }
    }
}
