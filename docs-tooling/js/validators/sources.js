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
    if (idx <= 0) return null;
    return { target: ref.slice(0, idx), slot: ref.slice(idx + 1) };
}

/**
 * Validate a theme-keys extractor payload (raw, not normalized).
 *
 * Rules:
 *   - error themeKeys/unknown-slot-shape: slot value isn't an object or function;
 *     classes/composes were dropped.
 *   - error themeKeys/unresolved-composes-ref: composes reference doesn't point
 *     at a known entry+slot in the bundle.
 */
export function validateThemeKeysPayload(payload) {
    const diagnostics = [];
    const entries = payload?.entries || [];

    const slotIndex = new Map();
    for (const entry of entries) {
        const slots = new Set((entry.slots || []).map((s) => s.name));
        slotIndex.set(entry.name, slots);
    }

    for (const entry of entries) {
        for (const slot of entry.slots || []) {
            if (slot.shape === "unknown") {
                diagnostics.push({
                    severity: "error",
                    file: slot.source?.file || entry.source?.file || "",
                    line: slot.source?.line || 0,
                    code: "themeKeys/unknown-slot-shape",
                    message: `Slot ${entry.name}.${slot.name} is neither an object nor a function; classes and composes are dropped.`,
                });
            }
            for (const ref of slot.composes || []) {
                const parsed = parseComposeRef(ref);
                if (!parsed) {
                    diagnostics.push({
                        severity: "error",
                        file: slot.source?.file || "",
                        line: slot.source?.line || 0,
                        code: "themeKeys/malformed-composes-ref",
                        message: `Slot ${entry.name}.${slot.name} composes "${ref}" is not in "Target.slot" form.`,
                    });
                    continue;
                }
                const targetSlots = slotIndex.get(parsed.target);
                if (!targetSlots) {
                    diagnostics.push({
                        severity: "error",
                        file: slot.source?.file || "",
                        line: slot.source?.line || 0,
                        code: "themeKeys/unresolved-composes-ref",
                        message: `Slot ${entry.name}.${slot.name} composes "${ref}" but no entry "${parsed.target}" exists.`,
                    });
                    continue;
                }
                if (!targetSlots.has(parsed.slot)) {
                    diagnostics.push({
                        severity: "error",
                        file: slot.source?.file || "",
                        line: slot.source?.line || 0,
                        code: "themeKeys/unresolved-composes-ref",
                        message: `Slot ${entry.name}.${slot.name} composes "${ref}" but entry "${parsed.target}" has no slot "${parsed.slot}".`,
                    });
                }
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
    if (!files || files.length === 0) return diagnostics;
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
