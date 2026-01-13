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

    it("throws when pk missing for non-detail view if throwOnUndefinedPk true", async () => {
        fetchModelInfo.mockResolvedValue({ actions: [{ name: "list", detail: false }] });
        await expect(getCRUDForTo({ app: "a", model: "b", view: "list", throwOnUndefinedPk: true })).rejects.toThrow(
            "pk is required for detail views",
        );
    });

    it("does not throw when pk missing for detail view even with throwOnUndefinedPk", async () => {
        fetchModelInfo.mockResolvedValue({ actions: [{ name: "retrieve", detail: true }] });
        const result = await getCRUDForTo({
            app: "a",
            model: "b",
            view: "retrieve",
            throwOnUndefinedPk: true,
        });
        expect(result).toEqual({
            name: "actionrouter.listview",
            params: { app: "a", model: "b", action: "retrieve" },
            query: undefined,
        });
    });
});
