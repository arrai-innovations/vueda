import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

let bdProps;
const BooleanDisplayStub = defineComponent({
    name: "BooleanDisplayStub",
    props: { value: null, trueLabel: String, falseLabel: String, inline: Boolean },
    setup(props) {
        return () => {
            bdProps = { ...props };
            return h("span", { "data-qa": "bd" }, String(props.value));
        };
    },
});
vi.mock("@vueda/display/boolean-display/BooleanDisplay.vue", () => ({ default: BooleanDisplayStub }));

let ColumnBoolean;
beforeEach(async () => {
    bdProps = undefined;
    ColumnBoolean = (await import("@vueda/objects-grid/ColumnBoolean.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/objects-grid/ColumnBoolean.vue", () => {
    scopedIt("binds the cell value and the default labels to BooleanDisplay", () => {
        const wrapper = mount(ColumnBoolean, { props: { value: true } });
        expect(bdProps.value).toBe(true);
        expect(bdProps.trueLabel).toBe("Yes");
        expect(bdProps.falseLabel).toBe("No");
        wrapper.unmount();
    });

    scopedIt("forwards label overrides from columnProps", () => {
        const wrapper = mount(ColumnBoolean, {
            props: { value: false, trueLabel: "Enabled", falseLabel: "Disabled" },
        });
        expect(bdProps.trueLabel).toBe("Enabled");
        expect(bdProps.falseLabel).toBe("Disabled");
        wrapper.unmount();
    });

    // A blank cell must reach the display as an empty value, not as a coerced true.
    scopedIt.each([
        ["null", null],
        ["undefined", undefined],
        ["an empty string", ""],
    ])("passes %s through unchanged", (_label, value) => {
        const wrapper = mount(ColumnBoolean, { props: { value } });
        expect(bdProps.value).toBe(value === undefined ? undefined : value);
        wrapper.unmount();
    });

    scopedIt("does not leak the remaining cell context props onto the display root", () => {
        const wrapper = mount(ColumnBoolean, {
            props: { value: true },
            attrs: { field: "is_active", formatted: "true", obj: { id: 1 } },
        });
        expect(wrapper.get('[data-qa="bd"]').attributes("field")).toBeUndefined();
        wrapper.unmount();
    });
});
