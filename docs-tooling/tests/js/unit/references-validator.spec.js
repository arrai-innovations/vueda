import { scanFileRefs } from "../../../js/validators/references.js";
import { describe, expect, it } from "vitest";

describe("scanFileRefs", () => {
    it("finds the reference in a labeled link", () => {
        const refs = scanFileRefs("Send [queue items]{@term Queue Item (VDQ)} with [`Card`]{@api vue:component:Card}.");
        expect(refs).toEqual([
            { type: "term", value: "Queue Item (VDQ)", line: 1, column: 19 },
            { type: "api", value: "vue:component:Card", line: 1, column: 57 },
        ]);
    });
});
