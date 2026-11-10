import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

let bdProps;
const BooleanDisplayStub = defineComponent({
    name: "BooleanDisplayStub",
    props: { value: null, trueLabel: String, falseLabel: String, options: Array, inline: Boolean },
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
            attrs: { formatted: "true", obj: { id: 1 } },
        });
        expect(wrapper.get('[data-qa="bd"]').attributes("formatted")).toBeUndefined();
        wrapper.unmount();
    });

    describe("Option labels", () => {
        const choices = [
            { label: "Standard handling", value: false },
            { label: "Expedited handling", value: true },
        ];

        scopedIt("forwards the field's displayChoices to BooleanDisplay", () => {
            const displayChoices = [{ label: "Submitted", value: true }];
            const wrapper = mount(ColumnBoolean, {
                props: { value: true, field: { name: "submitted", choices, displayChoices } },
            });
            expect(bdProps.options).toEqual(displayChoices);
            wrapper.unmount();
        });

        scopedIt("forwards the field's static choices when it has no displayChoices", () => {
            const wrapper = mount(ColumnBoolean, { props: { value: true, field: { name: "expedited", choices } } });
            expect(bdProps.options).toEqual(choices);
            wrapper.unmount();
        });

        scopedIt("forwards no options for a field without static choices", () => {
            const wrapper = mount(ColumnBoolean, {
                props: { value: true, field: { name: "is_active", choices: false } },
            });
            expect(bdProps.options).toEqual([]);
            wrapper.unmount();
        });
    });
});
