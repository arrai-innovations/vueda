/**
 * Source-side validation: catches authoring mistakes in the theme/CSS sources
 * that would silently degrade extracted documentation. Pure: takes a payload,
 * returns diagnostics.
 *
 * Diagnostic shape: { severity, file, line, code, message }
 *   severity: "error" | "warn"
 *   code:     stable identifier for the rule
 *
 * Errors fail the build; warnings are reported but don't fail.
 */

function parseComposeRef(ref) {
    const idx = ref.indexOf(".");
    if (idx <= 0) {
        return null;
    }
    return { target: ref.slice(0, idx), slot: ref.slice(idx + 1) };
}

/**
 * Validate a theme-keys extractor payload (raw, not normalized).
 *
 * The raw payload is a flat list of entries, each describing one slot of one
 * component (or composition primitive). Each entry carries the family,
 * component, slot, valueShape, composes references, and a source location.
 *
 * Rules:
 *   - error themeKeys/malformed-composes-ref: composes string lacks a dot or
 *     starts with a dot (cannot resolve to "Target.slot").
 *   - error themeKeys/unresolved-composes-ref: composes "Target.slot" does
 *     not point at a known component+slot in the bundle.
 */
export function validateThemeKeysPayload(payload) {
    const diagnostics = [];
    const entries = payload?.entries || [];

    // Index every (component, slot) pair that exists.
    const slotIndex = new Map();
    for (const entry of entries) {
        if (!entry.component) {
            continue;
        }
        if (!slotIndex.has(entry.component)) {
            slotIndex.set(entry.component, new Set());
        }
        slotIndex.get(entry.component).add(entry.slot);
    }

    for (const entry of entries) {
        for (const ref of entry.composes || []) {
            const parsed = parseComposeRef(ref);
            if (!parsed) {
                diagnostics.push({
                    severity: "error",
                    file: entry.source?.file || "",
                    line: entry.source?.line || 0,
                    code: "themeKeys/malformed-composes-ref",
                    message: `Slot ${entry.component}.${entry.slot} composes "${ref}" is not in "Target.slot" form.`,
                });
                continue;
            }
            const targetSlots = slotIndex.get(parsed.target);
            if (!targetSlots) {
                diagnostics.push({
                    severity: "error",
                    file: entry.source?.file || "",
                    line: entry.source?.line || 0,
                    code: "themeKeys/unresolved-composes-ref",
                    message: `Slot ${entry.component}.${entry.slot} composes "${ref}" but no component "${parsed.target}" exists.`,
                });
                continue;
            }
            if (!targetSlots.has(parsed.slot)) {
                diagnostics.push({
                    severity: "error",
                    file: entry.source?.file || "",
                    line: entry.source?.line || 0,
                    code: "themeKeys/unresolved-composes-ref",
                    message: `Slot ${entry.component}.${entry.slot} composes "${ref}" but component "${parsed.target}" has no slot "${parsed.slot}".`,
                });
            }
        }
    }

    return diagnostics;
}

/**
 * Filter diagnostics to a set of files (relative paths). When `files` is
 * undefined or empty, returns the input unchanged.
 */
export function filterDiagnosticsByFiles(diagnostics, files) {
    if (!files || files.length === 0) {
        return diagnostics;
    }
    const set = new Set(files);
    return diagnostics.filter((d) => set.has(d.file));
}

/**
 * Format a diagnostic as a single line `file:line: [severity code] message`.
 */
export function formatDiagnostic(d) {
    const loc = d.line ? `${d.file}:${d.line}` : d.file || "<unknown>";
    return `${loc}: [${d.severity} ${d.code}] ${d.message}`;
}
