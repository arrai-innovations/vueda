import { normalizeShortcutKeys, splitShortcutKeys } from "@vueda/display/kbd/shortcutKeys.js";
import { describe, expect, it } from "vitest";

describe("lib/display/kbd/shortcutKeys.js", () => {
    it("preserves structured shortcut arrays", () => {
        expect(normalizeShortcutKeys(["⌘", "⇧", "S"])).toEqual(["⌘", "⇧", "S"]);
        expect(normalizeShortcutKeys(["⌘", "", null, "K"])).toEqual(["⌘", "K"]);
    });

    it("splits whitespace-separated shortcut chords", () => {
        expect(splitShortcutKeys("⌘ ⇧ S")).toEqual(["⌘", "⇧", "S"]);
        expect(splitShortcutKeys("G R")).toEqual(["G", "R"]);
    });

    it("splits compact modifier notation", () => {
        expect(splitShortcutKeys("⌘E")).toEqual(["⌘", "E"]);
        expect(splitShortcutKeys("⇧⌘L")).toEqual(["⇧", "⌘", "L"]);
        expect(splitShortcutKeys("⌘⌫")).toEqual(["⌘", "⌫"]);
    });

    it("keeps non-modifier labels as one key", () => {
        expect(splitShortcutKeys("Esc")).toEqual(["Esc"]);
        expect(splitShortcutKeys("$")).toEqual(["$"]);
    });
});
