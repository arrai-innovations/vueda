import {
    cssTokenAnchor,
    formatApiMemberTitle,
    memberAnchorFromId,
    memberHeadingAnchor,
    memberNameFromId,
    themeKeySlotAnchor,
} from "../../../js/utils/reference-index.js";
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

describe("memberAnchorFromId", () => {
    it("returns no anchor for a component-level theme key", () => {
        expect(memberAnchorFromId("theme-key:StickyBar")).toBe("");
    });

    it("keeps slot name case, which the heading slug would lowercase", () => {
        expect(memberAnchorFromId("theme-key:ActionForm.selectedObjects")).toBe("theme-key-ActionForm-selectedObjects");
    });

    it("matches the anchor the theme-keys renderer writes", () => {
        expect(memberAnchorFromId("theme-key:WidgetDuration.innerItem")).toBe(
            themeKeySlotAnchor("WidgetDuration", "innerItem"),
        );
    });

    it("keeps the leading underscore of a primitive component", () => {
        expect(memberAnchorFromId("theme-key:_ActionBanner.root")).toBe("theme-key-_ActionBanner-root");
    });

    it("matches the anchor the css-tokens renderer writes", () => {
        expect(memberAnchorFromId("css-token:vueda-gap-sm")).toBe(cssTokenAnchor("--vueda-gap-sm"));
        expect(memberAnchorFromId("css-token:vueda-gap-sm")).toBe("css-token-vueda-gap-sm");
    });

    it("slugifies the member name for a renderer that gives headings an explicit id", () => {
        expect(memberAnchorFromId("js:property:@arrai-innovations/vueda/use/themeRegistry#defaultTheme")).toBe(
            "defaultTheme",
        );
        expect(memberAnchorFromId("py:function:vueda.core.config.TomlEnv._expand")).toBe("_expand");
    });
});

describe("memberHeadingAnchor", () => {
    it("leaves an interior underscore alone", () => {
        expect(memberHeadingAnchor("get_object")).toBe("get_object");
    });

    it("leaves a leading-only or trailing-only underscore alone", () => {
        expect(memberHeadingAnchor("_expand")).toBe("_expand");
        expect(memberHeadingAnchor("post_")).toBe("post_");
    });

    it("hyphenates a name with both a leading and a trailing underscore", () => {
        expect(memberHeadingAnchor("__call__")).toBe("--call--");
        expect(memberHeadingAnchor("_member_map_")).toBe("-member-map-");
    });

    it("keeps a hyphenated anchor distinct from a sibling member's name", () => {
        expect(memberHeadingAnchor("__dict__")).not.toBe(memberHeadingAnchor("dict"));
    });

    it("is what memberAnchorFromId returns for a python member", () => {
        expect(memberAnchorFromId("py:function:vueda.core.config.TomlEnv.__call__")).toBe(
            memberHeadingAnchor("__call__"),
        );
    });
});

describe("cssTokenAnchor", () => {
    it("drops the custom-property prefix", () => {
        expect(cssTokenAnchor("--vueda-control-height")).toBe("css-token-vueda-control-height");
    });

    it("accepts a name that already lacks the prefix", () => {
        expect(cssTokenAnchor("vueda-control-height")).toBe("css-token-vueda-control-height");
    });
});
