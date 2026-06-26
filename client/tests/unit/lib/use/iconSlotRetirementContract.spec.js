const componentModules = import.meta.glob("../../../../lib/**/*.vue", {
    query: "?raw",
    import: "default",
    eager: true,
});

const retiredSlotNames = [
    "icon",
    "search-icon",
    "indicator-icon",
    "check-icon",
    "close-icon",
    "success-icon",
    "info-icon",
    "warning-icon",
    "error-icon",
    "loading-icon",
    "sort-icon",
    "validation-icon",
    "banner-icon",
    "crest-icon",
];
const retiredSlotAlternation = retiredSlotNames.join("|");
const retiredSlotOutletPattern = new RegExp(`<slot\\s+name=["'](${retiredSlotAlternation})["']`, "g");
const retiredSlotPresencePattern = new RegExp(`\\$slots\\[['"](${retiredSlotAlternation})['"]\\]`, "g");

describe("icon slot retirement contract", () => {
    it("does not expose one-off icon replacement slots", () => {
        const findings = [];

        for (const [path, source] of Object.entries(componentModules)) {
            for (const match of source.matchAll(retiredSlotOutletPattern)) {
                findings.push(`${path}: remove <slot name="${match[1]}"> and use iconOverride/useIcons instead`);
            }

            for (const match of source.matchAll(retiredSlotPresencePattern)) {
                findings.push(`${path}: remove $slots['${match[1]}'] and use iconOverride/useIcons instead`);
            }
        }

        expect(findings, findings.join("\n")).toEqual([]);
    });
});
