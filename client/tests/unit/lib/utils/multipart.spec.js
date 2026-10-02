import fixtures from "../../../../../server/tests/fixtures/multipart-save.json";
import { encodeObjectBody } from "@vueda/utils/multipart.js";
import { defaultObjectCreate, defaultObjectPatch, defaultObjectUpdate } from "@vueda/utils/objectCrud.js";

vi.mock("@vueda/utils/urls.js", () => ({
    getDetailUrl: () => "https://domain.invalid/objects/1/",
    getListUrl: () => "https://domain.invalid/objects/",
}));
vi.mock("@vueda/utils/csrf.js", () => ({ getCSRFValue: () => "test-token" }));

const target = { app: "store", model: "invoice" };
const adapters = {
    create: (object) => defaultObjectCreate({ target, object, acknowledgeWarnings: "digest" }),
    update: (object) => defaultObjectUpdate({ target, object, acknowledgeWarnings: "digest" }),
    patch: (object) => defaultObjectPatch({ target, pk: 1, partialObject: object, acknowledgeWarnings: "digest" }),
};
const file = () => new File(["content"], "file.txt", { type: "text/plain" });

function fixtureInput(scenario) {
    if (scenario === "nested-file") {
        return { items: [{ name: "a", attachment: new File(["inline bytes"], "inline.txt", { type: "text/plain" }) }] };
    }
    if (scenario === "blob") {
        return { blob: new Blob(["blob bytes"], { type: "text/plain" }) };
    }
    return {
        file: new File(["parent bytes"], "parent.txt", { type: "text/plain" }),
        items: [{ tags: ["x", "y"], parent: { id: 1 }, note: null }],
        active: false,
        count: 0,
        empty_list: [],
        empty_object: {},
        empty_string: "",
    };
}

function readFile(value) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(value);
    });
}

describe("lib/utils/{multipart,objectCrud}.js", () => {
    beforeEach(() => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async (_url, options) => new Response("{}", { status: options.method === "POST" ? 201 : 200 })),
        );
    });
    afterEach(() => vi.unstubAllGlobals());

    describe.each(Object.keys(adapters))("%s transport", (adapter) => {
        it.each(fixtures)("sends the shared server fixture: $scenario", async (fixture) => {
            const promise = adapters[adapter](fixtureInput(fixture.scenario));
            expect(promise.cancel).toBeInstanceOf(Function);
            await promise;
            const options = fetch.mock.calls[0][1];
            expect(options.method).toBe({ create: "POST", update: "PUT", patch: "PATCH" }[adapter]);
            expect(options.headers).toEqual({ "X-CSRFToken": "test-token", "Acknowledge-Warnings": "digest" });
            expect(options.body).toBeInstanceOf(FormData);
            const fields = {};
            const files = [];
            for (const [part, value] of options.body) {
                if (value instanceof Blob) {
                    files.push({ part, name: value.name, type: value.type, content: await readFile(value) });
                } else {
                    fields[part] = value;
                }
            }
            expect({ fields, files }).toEqual({ fields: fixture.fields, files: fixture.files });
        });

        it("keeps JSON when no file exists", async () => {
            const object = {
                id: 1,
                items: [{ tags: ["x", "y"], parent: { id: 1 }, note: null }],
                active: false,
                count: 0,
            };
            await adapters[adapter](object);
            const options = fetch.mock.calls[0][1];
            expect(options.headers["Content-Type"]).toBe("application/json");
            expect(options.body).toBe(JSON.stringify(object));
        });

        it("rejects unsupported values before sending a request and names the path", () => {
            expect(() => adapters[adapter]({ file: file(), items: [{ value: undefined }] })).toThrow(
                '$["items"][0]["value"]',
            );
            expect(fetch).not.toHaveBeenCalled();
        });
    });

    it("maps files in nested objects and arrays without treating dotted keys as paths", () => {
        const attachment = file();
        const body = encodeObjectBody({ "literal.key": { children: [[attachment, null, false, 0]] } });
        expect(JSON.parse(body.get("literal.key"))).toEqual({ children: [[null, null, false, 0]] });
        expect(JSON.parse(body.get("__vueda_multipart")).files).toEqual({
            __vueda_file_0: ["literal.key", "children", 0, 0],
        });
        expect(body.get("__vueda_file_0")).toBe(attachment);
    });

    it("avoids collisions with user fields and preserves repeated object references", () => {
        const shared = { attachment: file() };
        const body = encodeObjectBody({ __vueda_file_0: "value", items: [shared, shared] });
        expect(body.get("__vueda_file_0")).toBe('"value"');
        expect(JSON.parse(body.get("__vueda_multipart")).files).toEqual({
            __vueda_file_1: ["items", 0, "attachment"],
            __vueda_file_2: ["items", 1, "attachment"],
        });
    });

    it.each([undefined, NaN, Infinity, 1n, () => {}, Symbol("value"), new Map(), new Date()])(
        "rejects unsupported multipart value %s",
        (value) => {
            expect(() => encodeObjectBody({ file: file(), items: [{ value }] })).toThrow('$["items"][0]["value"]');
        },
    );

    it("rejects circular references with their path", () => {
        const object = { file: file() };
        object.self = object;
        expect(() => encodeObjectBody(object)).toThrow('$["self"]: circular reference');
    });

    it("rejects the reserved manifest name only in multipart saves", () => {
        expect(encodeObjectBody({ __vueda_multipart: "user value" })).toBe('{"__vueda_multipart":"user value"}');
        expect(() => encodeObjectBody({ __vueda_multipart: "user value", file: file() })).toThrow(
            "reserved field name",
        );
    });

    it("rejects sparse arrays, extra array properties, and symbol keys", () => {
        expect(() => encodeObjectBody({ file: file(), items: Array(1) })).toThrow('$["items"][0]');
        const items = [];
        items.extra = "value";
        expect(() => encodeObjectBody({ file: file(), items })).toThrow("array properties");
        expect(() => encodeObjectBody({ file: file(), items: { [Symbol("extra")]: 1 } })).toThrow("symbol keys");
    });
});
