import { scopedIt } from "@tests/unit/utils.js";

describe("lib/utils/html.js", () => {
    let sanitizeMessage, sanitizeMessages, containsHtml;

    beforeEach(async () => {
        const mod = await import("@vueda/utils/html.js");
        sanitizeMessage = mod.sanitizeMessage;
        sanitizeMessages = mod.sanitizeMessages;
        containsHtml = mod.containsHtml;
    });

    afterEach(() => {
        vi.resetModules();
    });

    scopedIt("keeps allowlisted markup a server sends deliberately", () => {
        expect(sanitizeMessage('Click <a href="#" target="_blank">here</a> and <b>read</b>')).toBe(
            'Click <a href="#" target="_blank">here</a> and <b>read</b>',
        );
    });

    scopedIt("removes markup outside the allowlist", () => {
        expect(sanitizeMessage("<script>alert(1)</script>ok")).toBe("ok");
        expect(sanitizeMessage('<img src=x onerror="alert(1)">')).toBe("");
        expect(sanitizeMessage('<a href="#" onclick="alert(1)">link</a>')).toBe('<a href="#">link</a>');
    });

    scopedIt("leaves an entity-encoded message as literal text", () => {
        // The message names the tags rather than applying them, so the reader has to see them.
        expect(sanitizeMessage("&lt;b&gt;literal&lt;/b&gt;")).toBe("&lt;b&gt;literal&lt;/b&gt;");
        expect(sanitizeMessage("Smith &amp; Sons")).toBe("Smith &amp; Sons");
        expect(sanitizeMessage("&lt;script&gt;alert(1)&lt;/script&gt;")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
    });

    scopedIt("recursively sanitizes message collections", () => {
        expect(
            sanitizeMessages({
                simple: "Hello &amp; <i>world</i>",
                list: ["Item &lt;b&gt;1&lt;/b&gt;", "Plain"],
                nested: { "k&lt;1&gt;": "&lt;b&gt;Bold&lt;/b&gt;" },
            }),
        ).toEqual({
            simple: "Hello &amp; <i>world</i>",
            list: ["Item &lt;b&gt;1&lt;/b&gt;", "Plain"],
            nested: { "k&lt;1&gt;": "&lt;b&gt;Bold&lt;/b&gt;" },
        });
    });

    scopedIt("sanitizes a bare string collection", () => {
        expect(sanitizeMessages("<b>bold</b>")).toBe("<b>bold</b>");
    });

    scopedIt("detects html tags", () => {
        expect(containsHtml("<b>bold</b>")).toBe(true);
        expect(containsHtml("no html")).toBe(false);
        expect(containsHtml("&lt;escaped&gt;")).toBe(false);
    });
});
