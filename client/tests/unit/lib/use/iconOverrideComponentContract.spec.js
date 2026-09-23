const componentModules = import.meta.glob("../../../../lib/**/*.vue", {
    query: "?raw",
    import: "default",
    eager: true,
});

describe("lib/**/*.vue", () => {
    describe("iconOverride component contract", () => {
        it("all component useIcons consumers expose iconOverride and pass props", () => {
            const findings = [];

            for (const [path, source] of Object.entries(componentModules)) {
                if (!source.includes('from "@vueda/use/useIcons.js"')) {
                    continue;
                }

                if (!source.includes("ICON_OVERRIDE_PROPS")) {
                    findings.push(`${path}: missing ICON_OVERRIDE_PROPS import`);
                }
                if (!source.includes("...ICON_OVERRIDE_PROPS")) {
                    findings.push(`${path}: missing ICON_OVERRIDE_PROPS prop spread`);
                }

                for (const match of source.matchAll(/useIcons\(\s*["'][^"']+["']\s*(?:,\s*([^)]+))?\)/g)) {
                    if (match[1]?.trim() !== "props") {
                        findings.push(`${path}: useIcons call must pass props`);
                    }
                }
            }

            expect(findings, findings.join("\n")).toEqual([]);
        });
    });
});
