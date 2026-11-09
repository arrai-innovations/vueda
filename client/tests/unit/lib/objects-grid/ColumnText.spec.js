import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

let ColumnText;
beforeEach(async () => {
    ColumnText = (await import("@vueda/objects-grid/ColumnText.vue")).default;
});

describe("lib/objects-grid/ColumnText.vue", () => {
    scopedIt("renders a string value as-is", () => {
        const wrapper = mount(ColumnText, { props: { formatted: "hello" } });
        expect(wrapper.text()).toBe("hello");
        wrapper.unmount();
    });

    scopedIt("renders a number value", () => {
        const wrapper = mount(ColumnText, { props: { formatted: 42 } });
        expect(wrapper.text()).toBe("42");
        wrapper.unmount();
    });

    scopedIt("renders empty for null/undefined", () => {
        const wrapper = mount(ColumnText, { props: { formatted: null } });
        expect(wrapper.text()).toBe("");
        wrapper.unmount();
    });

    scopedIt("renders an object value as compact JSON without warning", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const wrapper = mount(ColumnText, { props: { formatted: { sku: "ABC", weight: 3 } } });
        expect(wrapper.text()).toBe('{"sku":"ABC","weight":3}');
        // The broadened prop type means no "Invalid prop" warning for objects.
        expect(warn.mock.calls.find((c) => String(c[0]).includes("Invalid prop"))).toBeUndefined();
        warn.mockRestore();
        wrapper.unmount();
    });

    scopedIt("renders an array value as compact JSON", () => {
        const wrapper = mount(ColumnText, { props: { formatted: [1, 2, 3] } });
        expect(wrapper.text()).toBe("[1,2,3]");
        wrapper.unmount();
    });

    scopedIt("truncates a very large object with an ellipsis", () => {
        const big = {};
        for (let i = 0; i < 50; i++) {
            big[`key${i}`] = `value-${i}`;
        }
        const wrapper = mount(ColumnText, { props: { formatted: big } });
        const text = wrapper.text();
        expect(text.length).toBe(200);
        expect(text.endsWith("…")).toBe(true);
        wrapper.unmount();
    });

    describe("choice labels", () => {
        const choices = [
            { label: "Office", value: "office" },
            { label: "Field", value: "field" },
        ];

        scopedIt("renders a single value as its choice label", () => {
            const wrapper = mount(ColumnText, { props: { formatted: "office", field: { name: "site", choices } } });
            expect(wrapper.text()).toBe("Office");
            wrapper.unmount();
        });

        scopedIt("renders a stored number as the label of its string option value", () => {
            const field = { name: "priority", choices: [{ label: "High", value: "1" }] };
            const wrapper = mount(ColumnText, { props: { formatted: 1, field } });
            expect(wrapper.text()).toBe("High");
            wrapper.unmount();
        });

        scopedIt("renders the displayChoices label over the choices label", () => {
            const field = { name: "site", choices, displayChoices: [{ label: "At the office", value: "office" }] };
            const wrapper = mount(ColumnText, { props: { formatted: "office", field } });
            expect(wrapper.text()).toBe("At the office");
            wrapper.unmount();
        });

        scopedIt("renders a many-valued field as its labels joined with a comma", () => {
            const wrapper = mount(ColumnText, {
                props: { formatted: ["office", "field"], field: { name: "sites", many: true, choices } },
            });
            expect(wrapper.text()).toBe("Office, Field");
            wrapper.unmount();
        });

        scopedIt("renders a value that matches no choice as stored", () => {
            const wrapper = mount(ColumnText, { props: { formatted: "remote", field: { name: "site", choices } } });
            expect(wrapper.text()).toBe("remote");
            wrapper.unmount();
        });

        scopedIt("renders the value of a field's own formatted path as it is", () => {
            const field = { name: "site", formatted: "site_display", choices };
            const wrapper = mount(ColumnText, { props: { formatted: "office", field } });
            expect(wrapper.text()).toBe("office");
            wrapper.unmount();
        });

        scopedIt("renders an array as JSON for choices from the choices endpoint", () => {
            const wrapper = mount(ColumnText, { props: { formatted: [1, 2], field: { name: "tags", choices: true } } });
            expect(wrapper.text()).toBe("[1,2]");
            wrapper.unmount();
        });

        scopedIt("renders empty for a null value", () => {
            const wrapper = mount(ColumnText, { props: { formatted: null, field: { name: "site", choices } } });
            expect(wrapper.text()).toBe("");
            wrapper.unmount();
        });
    });
});
