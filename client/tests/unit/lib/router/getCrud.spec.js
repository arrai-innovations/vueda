import { getCRUDForTo } from "@vueda/router/getCrud.js";
import { describe, expect, it } from "vitest";

describe("lib/router/getCrud.js", () => {
    it("returns detail route when pk string provided", async () => {
        const result = await getCRUDForTo({ app: "blog", model: "post", pk: "5", view: "detail" });
        expect(result).toEqual({
            name: "actionrouter.detailview",
            params: { app: "blog", model: "post", action: "detail", pk: "5" },
            query: undefined,
        });
    });

    it("returns list route with pk query when pk array provided", async () => {
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
            query: { foo: "bar", pk: ["1", "2"] },
        });
    });

    it("keeps a selected key that contains a comma whole", async () => {
        const result = await getCRUDForTo({ app: "a", model: "b", pk: ["a,b"], view: "bulk" });
        expect(result.query).toEqual({ pk: ["a,b"] });
    });

    it("carries the selection as it was when called", async () => {
        const pk = ["20"];
        const route = getCRUDForTo({ app: "catalog", model: "item", pk, view: "bulk" });
        pk.push("73");
        expect((await route).query.pk).toEqual(["20"]);
    });

    it("targets the list route with no selection for an empty array", async () => {
        const result = await getCRUDForTo({ app: "a", model: "b", pk: [], view: "bulk", query: { foo: "bar" } });
        expect(result).toEqual({
            name: "actionrouter.listview",
            params: { app: "a", model: "b", action: "bulk" },
            query: { foo: "bar" },
        });
    });

    it.each([
        ["with a selection", ["1"]],
        ["without a selection", undefined],
    ])("throws when query has a pk entry, %s", async (_label, pk) => {
        await expect(getCRUDForTo({ app: "a", model: "b", pk, view: "bulk", query: { pk: "9" } })).rejects.toThrow(
            "getCRUDForTo: query must not have a pk entry",
        );
    });
});
