import { expectReadOnlyWarning, scopedIt } from "@tests/unit/utils.js";
import { useSlotNameGrouper } from "@vueda/use/useSlotNameGrouper.js";
import { h, ref } from "vue";

describe("lib/use/useSlotNameGrouper.js", () => {
    scopedIt("groups slots by prefix and returns remaining", () => {
        const slots = {
            "field(foo)help": () => h("div"),
            "widget(foo)default": () => h("div"),
            other: () => h("div"),
        };
        const result = useSlotNameGrouper(["field", "widget"], "foo", slots);

        expect(result.grouped.field).toEqual([["field(foo)help", "help"]]);
        expect(result.grouped.widget).toEqual([["widget(foo)default", "default"]]);
        expect(result.remaining).toEqual(["other"]);
        expect(result.hasGrouped("field")).toBe(true);
        expect(result.hasGrouped("widget")).toBe(true);
        expect(result.hasGrouped("missing")).toBe(false);
    });

    scopedIt("reacts to changes in ref arguments", () => {
        const slots = {
            "widget(foo)default": () => h("div"),
            "widget(bar)default": () => h("div"),
        };
        const prefixes = ref(["widget"]);
        const field = ref("foo");
        const result = useSlotNameGrouper(prefixes, field, slots);

        expect(result.grouped.widget).toEqual([["widget(foo)default", "default"]]);

        field.value = "bar";
        expect(result.grouped.widget).toEqual([["widget(bar)default", "default"]]);

        prefixes.value = [];
        expect(result.grouped.widget).toBeUndefined();
        expect(result.remaining).toEqual(["widget(foo)default", "widget(bar)default"]);
    });

    scopedIt("includes slots for expanded field names", () => {
        const slots = {
            "widget(foo.child)label": () => h("div"),
        };
        const result = useSlotNameGrouper(["widget"], "foo", slots);

        expect(result.grouped.widget).toEqual([["widget(foo.child)label", "widget(foo.child)label"]]);
        expect(result.remaining).toEqual([]);
    });

    scopedIt("returns a read-only result", () => {
        const result = useSlotNameGrouper(["widget"], "foo", {});
        const groupedRef = result.grouped;
        const remainingRef = result.remaining;

        expectReadOnlyWarning(() => {
            result.grouped = null;
        }, "grouped");
        expectReadOnlyWarning(() => {
            result.remaining = [];
        }, "remaining");

        expect(result.grouped).toBe(groupedRef);
        expect(result.remaining).toBe(remainingRef);
    });
});
