import { getActionName } from "@vueda/utils/actionMap.js";

describe("lib/utils/actionMap.js", () => {
    it("maps read to retrieve", () => {
        expect(getActionName("read")).toBe("retrieve");
    });

    it("returns the action when no mapping exists", () => {
        expect(getActionName("create")).toBe("create");
    });
});
