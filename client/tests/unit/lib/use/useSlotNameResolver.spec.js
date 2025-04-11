import { scopedIt } from "@tests/unit/utils.js";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { h, ref } from "vue";

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    return {
        ...actual,
        useSlots: vi.fn(() => ({
            foo: () => h("div", "foo"),
            bar: () => h("div", "bar"),
        })),
    };
});

describe("lib/use/useSlotNameResolver.js", () => {
    scopedIt("returns the first matching slot name", () => {
        const slots = {
            foo: () => h("div", "foo"),
            bar: () => h("div", "bar"),
        };
        const slotNames = ["baz", "bar", "foo"];
        const result = useSlotNameResolver(slotNames, slots);

        expect(result.exists).toBe(true);
        expect(result.name).toBe("bar"); // first match wins
    });

    scopedIt("returns undefined if no slots match", () => {
        const slots = {
            foo: () => h("div", "foo"),
        };
        const slotNames = ["baz", "qux"];
        const result = useSlotNameResolver(slotNames, slots);

        expect(result.exists).toBe(false);
        expect(result.name).toBe(undefined);
    });

    scopedIt("reacts to changes in ref-based slot names", () => {
        const slots = {
            foo: () => h("div", "foo"),
            bar: () => h("div", "bar"),
        };
        const names = ref(["bar", "baz"]);
        const result = useSlotNameResolver(names, slots);
        expect(result.name).toBe("bar");

        names.value = ["baz", "foo"];
        expect(result.name).toBe("foo");
    });

    scopedIt("supports Ref<Ref<string>[]>, unwrapping properly", () => {
        const slots = {
            alpha: () => h("div", "alpha"),
        };
        const slotRefs = [ref("beta"), ref("alpha")];
        const result = useSlotNameResolver(ref(slotRefs), slots);

        expect(result.exists).toBe(true);
        expect(result.name).toBe("alpha");
    });

    scopedIt("uses injected useSlots() when no slots passed", () => {
        const result = useSlotNameResolver(["baz", "bar", "foo"]);
        expect(result.exists).toBe(true);
        expect(result.name).toBe("bar"); // based on mocked useSlots()
    });
});
