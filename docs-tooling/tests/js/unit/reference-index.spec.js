import { formatApiMemberTitle, memberNameFromId } from "../../../js/utils/reference-index.js";
import { describe, expect, it } from "vitest";

describe("memberNameFromId", () => {
    it("returns an empty member name for a component-level theme key", () => {
        expect(memberNameFromId("theme-key:StickyBar")).toBe("");
    });

    it("returns the slot name for a theme-key slot", () => {
        expect(memberNameFromId("theme-key:StickyBar.root")).toBe("root");
    });
});

describe("formatApiMemberTitle", () => {
    it("uses the page title when the member name is empty", () => {
        expect(formatApiMemberTitle("StickyBar", "")).toBe("StickyBar");
    });

    it("appends a non-empty member name", () => {
        expect(formatApiMemberTitle("StickyBar", "root")).toBe("StickyBar.root");
    });
});
