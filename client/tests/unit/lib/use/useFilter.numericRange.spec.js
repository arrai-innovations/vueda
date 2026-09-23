import { scopedIt, withSetup } from "@tests/unit/utils.js";
import { useFilter } from "@vueda/use/useFilter.js";
import { availableFields, availableWidgets } from "@vueda/utils/formLookups.js";
import { reactive, toRaw } from "vue";

vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: () => ({ config: {} }),
}));

describe("lib/use/useFilter.js", () => {
    scopedIt("resolves numeric range filters and both optional numeric boundaries", async () => {
        const state = await withSetup(() =>
            useFilter(
                reactive({
                    app: "catalog",
                    model: "widget",
                    filterables: ["unit_price", "weight_kg"],
                    filterableDetails: {
                        unit_price: { typeFilter: "RangeField", suffixes: ["min", "max"], label: "Unit price" },
                        weight_kg: { typeFilter: "RangeField", suffixes: ["min", "max"], label: "Weight (kg)" },
                    },
                }),
            ),
        );
        for (const name of ["unit_price", "weight_kg"]) {
            expect(toRaw(state.fieldComponents[name])).toBe(availableFields.FieldSetRange);
            expect(state.fieldProps[name]).toMatchObject({ type: "number", suffixes: ["min", "max"] });
            for (const suffix of ["min", "max"]) {
                const boundary = `${name}.${suffix}`;
                expect(toRaw(state.fieldComponents[boundary])).toBe(availableFields.FormField);
                expect(toRaw(state.widgetComponents[boundary])).toBe(availableWidgets.WidgetNumberInput);
                expect(state.fieldProps[boundary]).toMatchObject({ required: false, validation: "decimal" });
                expect(state.widgetProps[boundary]).toMatchObject({ stepSnapping: false });
            }
        }
    });
});
