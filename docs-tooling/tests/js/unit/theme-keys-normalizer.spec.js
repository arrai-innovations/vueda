import { ThemeKeysNormalizer } from "../../../js/normalizers/theme-keys.js";
import { describe, expect, it } from "vitest";

const RAW = {
    sourceFiles: ["client/lib/theme/vueda-tailwind/controls/index.js"],
    entries: [
        {
            name: "_ButtonBase",
            isMetaKey: true,
            description: null,
            source: { file: "controls/index.js", line: 10 },
            slots: [
                {
                    name: "root",
                    isFunction: false,
                    composes: [],
                    rawClasses: ["inline-flex"],
                    source: { file: "controls/index.js", line: 11 },
                },
            ],
        },
        {
            name: "_ButtonGhost",
            isMetaKey: true,
            description: null,
            source: { file: "controls/index.js", line: 20 },
            slots: [
                {
                    name: "root",
                    isFunction: false,
                    composes: [],
                    rawClasses: ["hover:bg-accent"],
                    source: { file: "controls/index.js", line: 21 },
                },
            ],
        },
        {
            name: "Button",
            isMetaKey: false,
            description: null,
            source: { file: "controls/index.js", line: 30 },
            slots: [
                {
                    name: "root",
                    isFunction: true,
                    composes: [],
                    rawClasses: [],
                    source: { file: "controls/index.js", line: 31 },
                },
            ],
        },
        {
            name: "CalendarCellTrigger",
            isMetaKey: false,
            description: null,
            source: { file: "controls/index.js", line: 40 },
            slots: [
                {
                    name: "root",
                    isFunction: false,
                    composes: ["_ButtonBase.root", "_ButtonGhost.root"],
                    rawClasses: [],
                    source: { file: "controls/index.js", line: 41 },
                },
            ],
        },
    ],
};

describe("ThemeKeysNormalizer", () => {
    it("emits a kind: theme-keys bundle preserving entry order and fields", () => {
        const bundle = new ThemeKeysNormalizer().normalize(RAW);
        expect(bundle.kind).toBe("theme-keys");
        expect(bundle.entries.map((e) => e.name)).toEqual([
            "_ButtonBase",
            "_ButtonGhost",
            "Button",
            "CalendarCellTrigger",
        ]);
    });

    it("builds composedBy reverse index from each composes reference", () => {
        const bundle = new ThemeKeysNormalizer().normalize(RAW);
        const base = bundle.entries.find((e) => e.name === "_ButtonBase");
        expect(base.composedBy).toEqual([{ consumer: "CalendarCellTrigger", slot: "root", condition: null }]);
        const ghost = bundle.entries.find((e) => e.name === "_ButtonGhost");
        expect(ghost.composedBy).toEqual([{ consumer: "CalendarCellTrigger", slot: "root", condition: null }]);
    });

    it("leaves composedBy empty for entries with no inbound references", () => {
        const bundle = new ThemeKeysNormalizer().normalize(RAW);
        const cct = bundle.entries.find((e) => e.name === "CalendarCellTrigger");
        expect(cct.composedBy).toEqual([]);
    });

    it("function-form slots contribute nothing to the reverse index", () => {
        const bundle = new ThemeKeysNormalizer().normalize(RAW);
        const button = bundle.entries.find((e) => e.name === "Button");
        // Button.root is function-form; no composes refs added.
        expect(button.composedBy).toEqual([]);
    });

    it("ignores composes targeting unknown entries", () => {
        const bundle = new ThemeKeysNormalizer().normalize({
            entries: [
                {
                    name: "Foo",
                    isMetaKey: false,
                    description: null,
                    source: { file: "x.js", line: 1 },
                    slots: [
                        {
                            name: "root",
                            isFunction: false,
                            composes: ["_DoesNotExist.root"],
                            rawClasses: [],
                            source: { file: "x.js", line: 2 },
                        },
                    ],
                },
            ],
        });
        expect(bundle.entries.length).toBe(1);
        expect(bundle.entries[0].composedBy).toEqual([]);
    });

    it("returns an empty bundle for an empty payload without crashing", () => {
        const bundle = new ThemeKeysNormalizer().normalize({ entries: [] });
        expect(bundle).toEqual({ kind: "theme-keys", entries: [] });
    });
});
