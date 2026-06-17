import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

let ColumnText;
beforeEach(async () => {
    ColumnText = (await import("@vueda/components/ColumnText.vue")).default;
});

describe("lib/components/ColumnText.vue", () => {
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
});
