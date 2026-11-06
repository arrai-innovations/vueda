import { getActionName, getViewName, unroutedActionNames } from "@vueda/utils/actionMap.js";

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
});
