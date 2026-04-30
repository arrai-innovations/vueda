import { renderThemeKeysBundle } from "../../../js/renderers/theme-keys.js";
import { describe, expect, it } from "vitest";

const BUNDLE = {
    kind: "theme-keys",
    entries: [
        {
            name: "_ButtonGhost",
            isMetaKey: true,
            description: null,
            source: { file: "controls/index.js", line: 20 },
            slots: [
                {
                    name: "root",
                    shape: "object",
                    composes: [],
                    rawClasses: ["hover:bg-accent"],
                    source: { file: "controls/index.js", line: 21 },
                },
            ],
            composedBy: [{ consumer: "CalendarCellTrigger", slot: "root", condition: null }],
        },
        {
            name: "Button",
            isMetaKey: false,
            description: null,
            source: { file: "controls/index.js", line: 30 },
            slots: [
                {
                    name: "root",
                    shape: "function",
                    composes: [],
                    rawClasses: [],
                    source: { file: "controls/index.js", line: 31 },
                },
            ],
            composedBy: [],
        },
        {
            name: "CalendarCellTrigger",
            isMetaKey: false,
            description: null,
            source: { file: "controls/index.js", line: 40 },
            slots: [
                {
                    name: "root",
                    shape: "object",
                    composes: ["_ButtonBase.root", "_ButtonGhost.root"],
                    rawClasses: ["size-8"],
                    source: { file: "controls/index.js", line: 41 },
                },
            ],
            composedBy: [],
        },
    ],
};

describe("renderThemeKeysBundle", () => {
    it("emits one page per entry plus an index page", () => {
        const outputs = renderThemeKeysBundle(BUNDLE);
        expect(outputs.has("theming/keys.md")).toBe(true);
        expect(outputs.has("theming/keys/_ButtonGhost.md")).toBe(true);
        expect(outputs.has("theming/keys/Button.md")).toBe(true);
        expect(outputs.has("theming/keys/CalendarCellTrigger.md")).toBe(true);
    });

    it("frontmatter id uses the theme-key: prefix", () => {
        const outputs = renderThemeKeysBundle(BUNDLE);
        const page = outputs.get("theming/keys/_ButtonGhost.md");
        expect(page).toContain('id: "theme-key:_ButtonGhost"');
    });

    it("meta-key page shows the meta-key tag", () => {
        const outputs = renderThemeKeysBundle(BUNDLE);
        const page = outputs.get("theming/keys/_ButtonGhost.md");
        expect(page).toContain("Meta key");
        const button = outputs.get("theming/keys/Button.md");
        expect(button).not.toContain("Meta key");
    });

    it("function-form slot renders 'Variant-driven; see source.'", () => {
        const outputs = renderThemeKeysBundle(BUNDLE);
        const page = outputs.get("theming/keys/Button.md");
        expect(page).toContain("Variant-driven; see source.");
    });

    it("static slot lists rawClasses and composes", () => {
        const outputs = renderThemeKeysBundle(BUNDLE);
        const page = outputs.get("theming/keys/CalendarCellTrigger.md");
        expect(page).toContain("size-8");
        expect(page).toContain("{@api theme-key:_ButtonGhost}");
    });

    it("composes reference to an unknown entry falls back to inline code", () => {
        const outputs = renderThemeKeysBundle(BUNDLE);
        const page = outputs.get("theming/keys/CalendarCellTrigger.md");
        // _ButtonBase is not in the bundle, so it must not be linked as {@api ...}.
        expect(page).not.toContain("{@api theme-key:_ButtonBase}");
        expect(page).toContain("_ButtonBase");
    });

    it("composedBy section lists consumers", () => {
        const outputs = renderThemeKeysBundle(BUNDLE);
        const page = outputs.get("theming/keys/_ButtonGhost.md");
        expect(page).toContain("Composed by");
        expect(page).toContain("{@api theme-key:CalendarCellTrigger}");
    });

    it("omits Composed by section when empty", () => {
        const outputs = renderThemeKeysBundle(BUNDLE);
        const page = outputs.get("theming/keys/Button.md");
        expect(page).not.toContain("Composed by");
    });

    it("emits a Vue component link when componentNames includes the entry name", () => {
        const outputs = renderThemeKeysBundle(BUNDLE, { componentNames: new Set(["Button"]) });
        const page = outputs.get("theming/keys/Button.md");
        expect(page).toContain("{@api vue:component:Button}");
    });

    it("does not emit a Vue component link when componentNames is empty", () => {
        const outputs = renderThemeKeysBundle(BUNDLE);
        const page = outputs.get("theming/keys/Button.md");
        expect(page).not.toContain("vue:component:");
    });

    it("source section shows file:line", () => {
        const outputs = renderThemeKeysBundle(BUNDLE);
        const page = outputs.get("theming/keys/_ButtonGhost.md");
        expect(page).toContain("controls/index.js:20");
    });

    it("index page lists components and meta keys in separate sections", () => {
        const outputs = renderThemeKeysBundle(BUNDLE);
        const index = outputs.get("theming/keys.md");
        expect(index).toContain('id: "theming:keys"');
        expect(index).toContain("## Components");
        expect(index).toContain("## Meta keys");
        expect(index).toContain("./keys/Button.md");
        expect(index).toContain("./keys/_ButtonGhost.md");
    });

    it("returns an empty Map for a bundle whose kind is not theme-keys", () => {
        const outputs = renderThemeKeysBundle({ kind: "css-tokens", entries: [] });
        expect(outputs.size).toBe(0);
    });

    it("emits only the index page for an empty entries array", () => {
        const outputs = renderThemeKeysBundle({ kind: "theme-keys", entries: [] });
        expect(outputs.size).toBe(1);
        expect(outputs.has("theming/keys.md")).toBe(true);
    });

    it("omits the Slots section when an entry has no slots", () => {
        const bundle = {
            kind: "theme-keys",
            entries: [
                {
                    name: "Empty",
                    isMetaKey: false,
                    description: null,
                    source: { file: "x.js", line: 1 },
                    slots: [],
                    composedBy: [],
                },
            ],
        };
        const page = renderThemeKeysBundle(bundle).get("theming/keys/Empty.md");
        expect(page).not.toContain("## Slots");
    });

    it("omits the Composes block when a slot has no composes refs", () => {
        // CalendarCellTrigger has composes; Button (function-form) and _ButtonGhost do not.
        const outputs = renderThemeKeysBundle(BUNDLE);
        const ghost = outputs.get("theming/keys/_ButtonGhost.md");
        expect(ghost).not.toContain("Composes:");
    });

    it("omits the Classes block when a slot has no rawClasses", () => {
        const bundle = {
            kind: "theme-keys",
            entries: [
                {
                    name: "Foo",
                    isMetaKey: false,
                    description: null,
                    source: { file: "x.js", line: 1 },
                    slots: [
                        {
                            name: "root",
                            shape: "object",
                            composes: [],
                            rawClasses: [],
                            source: { file: "x.js", line: 2 },
                        },
                    ],
                    composedBy: [],
                },
            ],
        };
        const page = renderThemeKeysBundle(bundle).get("theming/keys/Foo.md");
        expect(page).not.toContain("Classes:");
    });

    it("omits the Source section when entry has no source.file", () => {
        const bundle = {
            kind: "theme-keys",
            entries: [
                {
                    name: "Foo",
                    isMetaKey: false,
                    description: null,
                    source: { file: "", line: 0 },
                    slots: [],
                    composedBy: [],
                },
            ],
        };
        const page = renderThemeKeysBundle(bundle).get("theming/keys/Foo.md");
        expect(page).not.toContain("## Source");
    });

    it("renders entry description when present", () => {
        const bundle = {
            kind: "theme-keys",
            entries: [
                {
                    name: "Foo",
                    isMetaKey: false,
                    description: "Hand-authored summary.",
                    source: { file: "x.js", line: 1 },
                    slots: [],
                    composedBy: [],
                },
            ],
        };
        const page = renderThemeKeysBundle(bundle).get("theming/keys/Foo.md");
        expect(page).toContain("Hand-authored summary.");
    });

    it("index page omits Components heading when only meta keys exist", () => {
        const bundle = {
            kind: "theme-keys",
            entries: [
                {
                    name: "_Only",
                    isMetaKey: true,
                    description: null,
                    source: { file: "x.js", line: 1 },
                    slots: [],
                    composedBy: [],
                },
            ],
        };
        const index = renderThemeKeysBundle(bundle).get("theming/keys.md");
        expect(index).not.toContain("## Components");
        expect(index).toContain("## Meta keys");
    });

    it("index page omits Meta keys heading when only components exist", () => {
        const bundle = {
            kind: "theme-keys",
            entries: [
                {
                    name: "Only",
                    isMetaKey: false,
                    description: null,
                    source: { file: "x.js", line: 1 },
                    slots: [],
                    composedBy: [],
                },
            ],
        };
        const index = renderThemeKeysBundle(bundle).get("theming/keys.md");
        expect(index).toContain("## Components");
        expect(index).not.toContain("## Meta keys");
    });

    it("composedBy consumer falls back to inline code when consumer is not in the bundle", () => {
        // Consumer "Stranger" is referenced in composedBy but not present as an entry.
        const bundle = {
            kind: "theme-keys",
            entries: [
                {
                    name: "_Base",
                    isMetaKey: true,
                    description: null,
                    source: { file: "x.js", line: 1 },
                    slots: [],
                    composedBy: [{ consumer: "Stranger", slot: "root", condition: null }],
                },
            ],
        };
        const page = renderThemeKeysBundle(bundle).get("theming/keys/_Base.md");
        expect(page).not.toContain("{@api theme-key:Stranger}");
        expect(page).toContain("`Stranger`");
    });
});
