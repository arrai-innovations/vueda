import { getActionName, getActionRequestMethod, getViewName, unroutedActionNames } from "@vueda/utils/actionMap.js";

describe("lib/utils/actionMap.js", () => {
    it("maps read to retrieve", () => {
        expect(getActionName("read")).toBe("retrieve");
    });

    it("returns the action when no mapping exists", () => {
        expect(getActionName("create")).toBe("create");
    });

    it("maps retrieve back to read", () => {
        expect(getViewName("retrieve")).toBe("read");
    });

    it("returns the view name when no mapping exists", () => {
        expect(getViewName("create")).toBe("create");
    });

    it("lists partial_update as an action without a client route", () => {
        expect(unroutedActionNames.has("partial_update")).toBe(true);
        expect(unroutedActionNames.has("update")).toBe(false);
    });

    describe("getActionRequestMethod", () => {
        it("chooses PUT when the action accepts it", () => {
            expect(getActionRequestMethod(["post", "put", "delete"])).toBe("PUT");
        });

        it("chooses the only write method that the action accepts", () => {
            expect(getActionRequestMethod(["post"])).toBe("POST");
        });

        it("skips read methods to reach the first write method", () => {
            expect(getActionRequestMethod(["get", "head", "options", "post"])).toBe("POST");
        });

        it("chooses the first write method in list order", () => {
            expect(getActionRequestMethod(["delete", "patch"])).toBe("DELETE");
        });

        it("chooses the preferred method when the action lists it", () => {
            expect(getActionRequestMethod(["get", "post", "patch"], "PATCH")).toBe("PATCH");
            expect(getActionRequestMethod(["patch"], "patch")).toBe("PATCH");
        });

        it("chooses no method when the action does not list the preferred method", () => {
            expect(getActionRequestMethod([], "PATCH")).toBeNull();
            expect(getActionRequestMethod(["get", "post"], "PATCH")).toBeNull();
            expect(getActionRequestMethod(["get"], "GET")).toBeNull();
        });

        it("chooses no method when the action lists no write method", () => {
            expect(getActionRequestMethod(["get"])).toBeNull();
            expect(getActionRequestMethod([])).toBeNull();
            expect(getActionRequestMethod()).toBeNull();
        });
    });
});
