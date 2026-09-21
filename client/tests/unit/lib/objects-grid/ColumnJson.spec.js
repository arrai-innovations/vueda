import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

let jdProps;
const JsonDisplayStub = defineComponent({
    name: "JsonDisplayStub",
    props: { value: null, maxLength: Number, inline: Boolean },
    setup(props) {
        return () => {
            jdProps = { ...props };
            return h("span", { "data-qa": "jd" }, JSON.stringify(props.value ?? null));
        };
    },
});
vi.mock("@vueda/display/json-display/JsonDisplay.vue", () => ({ default: JsonDisplayStub }));

let ColumnJson;
beforeEach(async () => {
    jdProps = undefined;
    ColumnJson = (await import("@vueda/objects-grid/ColumnJson.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/objects-grid/ColumnJson.vue", () => {
    scopedIt("binds the cell value and renders the inline form", () => {
        const wrapper = mount(ColumnJson, { props: { value: { a: 1 } } });
        expect(jdProps.value).toEqual({ a: 1 });
        expect(jdProps.inline).toBe(true);
        expect(jdProps.maxLength).toBe(200);
        wrapper.unmount();
    });

    scopedIt("forwards a maxLength override from columnProps", () => {
        const wrapper = mount(ColumnJson, { props: { value: { a: 1 }, maxLength: 40 } });
        expect(jdProps.maxLength).toBe(40);
        wrapper.unmount();
    });

    scopedIt.each([
        ["null", null],
        ["undefined", undefined],
    ])("passes %s through unchanged", (_label, value) => {
        const wrapper = mount(ColumnJson, { props: { value } });
        expect(jdProps.value).toBe(value === undefined ? undefined : value);
        wrapper.unmount();
    });

    scopedIt("does not leak the remaining cell context props onto the display root", () => {
        const wrapper = mount(ColumnJson, {
            props: { value: { a: 1 } },
            attrs: { field: "specifications", formatted: '{"a":1}', obj: { id: 1 } },
        });
        expect(wrapper.get('[data-qa="jd"]').attributes("field")).toBeUndefined();
        wrapper.unmount();
    });
});
