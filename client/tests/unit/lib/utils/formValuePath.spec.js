import { toFlatValuePath } from "@vueda/utils/formValuePath.js";
import get from "lodash-es/get.js";
import set from "lodash-es/set.js";

describe("lib/utils/formValuePath.js", () => {
    describe("toFlatValuePath", () => {
        it("wraps a name in lodash's bracket-quoted path syntax", () => {
            expect(toFlatValuePath("employee.name")).toBe("['employee.name']");
        });

        it("addresses a dotted name as one flat key rather than a nested path", () => {
            const values = {};
            set(values, toFlatValuePath("employee.name"), "Bob");

            expect(values).toEqual({ "employee.name": "Bob" });
            expect(values.employee).toBeUndefined();
            expect(get(values, toFlatValuePath("employee.name"))).toBe("Bob");
        });

        it("does not disturb a genuinely nested sibling under the same first segment", () => {
            const values = { employee: { id: 1 } };
            set(values, toFlatValuePath("employee.name"), "Bob");

            expect(values).toEqual({ employee: { id: 1 }, "employee.name": "Bob" });
        });

        it("addresses a plain undotted name the same way a bare name would", () => {
            const values = {};
            set(values, toFlatValuePath("name"), "Bob");

            expect(values).toEqual({ name: "Bob" });
            expect(get(values, "name")).toBe("Bob");
        });
    });
});
