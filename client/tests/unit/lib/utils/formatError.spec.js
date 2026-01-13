import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const inspectMock = vi.fn((obj) => `inspected:${JSON.stringify(obj)}`);
vi.mock("browser-util-inspect", () => ({ default: inspectMock }));

describe("lib/utils/formatError.js", () => {
    let formatError;
    const originalDev = import.meta.env.DEV;

    beforeEach(async () => {
        formatError = (await import("@vueda/utils/formatError.js")).formatError;
        inspectMock.mockClear();
    });

    afterEach(() => {
        import.meta.env.DEV = originalDev;
        vi.resetModules();
        vi.clearAllMocks();
    });

    it("includes stack trace when in DEV mode", () => {
        import.meta.env.DEV = true;
        const error = new Error("oops");
        const msg = formatError(error);
        expect(msg).toContain(`Error\u2014oops`);
        expect(msg).toContain(error.stack);
    });

    it("formats name and message without stack", () => {
        import.meta.env.DEV = false;
        const error = { name: "Foo", message: "bar" };
        expect(formatError(error)).toBe("Foo\u2014bar");
    });

    it("handles partial name or message", () => {
        import.meta.env.DEV = false;
        expect(formatError({ name: "Foo" })).toBe("Foo");
        expect(formatError({ message: "bar" })).toBe("bar");
    });

    it("includes response information", () => {
        import.meta.env.DEV = false;
        const error = {
            name: "FetchError",
            message: "failed",
            response: { status: 404, statusText: "Not Found", stack: "server stack" },
            responseData: { detail: "details", serverStack: "srv stack" },
        };
        const msg = formatError(error);
        expect(msg).toContain("FetchError\u2014failed");
        expect(msg).toContain("404: Not Found");
        expect(msg).toContain("details");
        expect(msg).toContain("server stack");
        expect(msg).toContain("srv stack");
    });

    it("uses inspect when no output generated", () => {
        import.meta.env.DEV = false;
        const obj = { foo: "bar" };
        const msg = formatError(obj);
        expect(inspectMock).toHaveBeenCalledWith(obj);
        expect(msg).toBe(`inspected:${JSON.stringify(obj)}`);
    });

    it("joins multiple errors", () => {
        import.meta.env.DEV = false;
        const e1 = { name: "A", message: "one" };
        const e2 = { name: "B", message: "two" };
        expect(formatError([e1, e2])).toBe("A\u2014one\n\nB\u2014two");
    });
});
