import { getCRUDForTo } from "@vueda/router/getCrud.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchModelInfo = vi.fn();

vi.mock("@vueda/stores/storeModelInfo.js", () => ({
    storeModelInfo: () => ({ fetchModelInfo }),
}));

describe("lib/router/getCrud.js", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns detail route when pk string provided", async () => {
        fetchModelInfo.mockResolvedValue({ actions: [{ name: "detail", detail: true }] });
        const result = await getCRUDForTo({ app: "blog", model: "post", pk: "5", view: "detail" });
        expect(fetchModelInfo).toHaveBeenCalledWith({ app: "blog", model: "post" });
        expect(result).toEqual({
            name: "actionrouter.detailview",
            params: { app: "blog", model: "post", action: "detail", pk: "5" },
            query: undefined,
        });
    });

    it("returns list route with pk query when pk array provided", async () => {
        fetchModelInfo.mockResolvedValue({ actions: [{ name: "bulk", detail: false }] });
        const result = await getCRUDForTo({
            app: "a",
            model: "b",
            pk: ["1", "2"],
            view: "bulk",
            query: { foo: "bar" },
        });
        expect(result).toEqual({
            name: "actionrouter.listview",
            params: { app: "a", model: "b", action: "bulk" },
            query: { pk: "1,2", foo: "bar" },
        });
    });

    it("captures the selection before waiting for metadata", async () => {
        let resolveMetadata;
        fetchModelInfo.mockReturnValue(new Promise((resolve) => (resolveMetadata = resolve)));
        const pk = ["20"];
        const route = getCRUDForTo({ app: "catalog", model: "item", pk, view: "bulk" });
        pk.push("73");
        resolveMetadata({ actions: [] });
        expect((await route).query.pk).toBe("20");
    });
});
