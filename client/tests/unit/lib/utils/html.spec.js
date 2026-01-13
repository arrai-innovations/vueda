import { scopedIt } from "@tests/unit/utils.js";
import DOMPurify from "dompurify";

vi.mock("dompurify", () => ({
    __esModule: true,
    default: { sanitize: vi.fn((msg) => msg) },
}));

describe("lib/utils/html.js", () => {
    let sanitizeMessage, sanitizeMessages, containsHtml;

    beforeEach(async () => {
        const mod = await import("@vueda/utils/html.js");
        sanitizeMessage = mod.sanitizeMessage;
        sanitizeMessages = mod.sanitizeMessages;
        containsHtml = mod.containsHtml;
        DOMPurify.sanitize.mockClear();
    });

    afterEach(() => {
        vi.resetModules();
    });

    scopedIt("sanitizes a single message", () => {
        const msg = 'Click &lt;a href="#"&gt;here&lt;/a&gt; &amp; enjoy';
        const result = sanitizeMessage(msg);
        expect(DOMPurify.sanitize).toHaveBeenCalledWith('Click <a href="#">here</a> & enjoy', {
            ALLOWED_TAGS: ["b", "strong", "i", "em", "p", "a", "ul", "ol", "li"],
            ALLOWED_ATTR: ["href", "target", "rel"],
        });
        expect(result).toBe('Click <a href="#">here</a> & enjoy');
    });

    scopedIt("recursively sanitizes message collections", () => {
        const messages = {
            simple: "Hello &amp; <i>world</i>",
            list: ["Item &lt;b&gt;1&lt;/b&gt;", "Plain"],
            nested: { "k&lt;1&gt;": "&lt;b&gt;Bold&lt;/b&gt;" },
        };
        const result = sanitizeMessages(messages);

        expect(result).toEqual({
            simple: "Hello & <i>world</i>",
            list: ["Item <b>1</b>", "Plain"],
            nested: { "k<1>": "<b>Bold</b>" },
        });
        expect(DOMPurify.sanitize).toHaveBeenCalledTimes(5);
    });

    scopedIt("detects html tags", () => {
        expect(containsHtml("<b>bold</b>")).toBe(true);
        expect(containsHtml("no html")).toBe(false);
        expect(containsHtml("&lt;escaped&gt;")).toBe(false);
    });
});
