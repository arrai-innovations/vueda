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
            query: { pk: "1,2", foo: "bar" },
        });
    });

    it("carries the selection as it was when called", async () => {
        const pk = ["20"];
        const route = getCRUDForTo({ app: "catalog", model: "item", pk, view: "bulk" });
        pk.push("73");
        expect((await route).query.pk).toBe("20");
    });
});
