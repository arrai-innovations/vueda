import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

let ddProps;
const DurationDisplayStub = defineComponent({
    name: "DurationDisplayStub",
    props: { value: null, format: String, inline: Boolean },
    setup(props) {
        return () => {
            ddProps = { ...props };
            return h("span", { "data-qa": "dd" }, String(props.value));
        };
    },
});
vi.mock("@vueda/display/duration-display/DurationDisplay.vue", () => ({ default: DurationDisplayStub }));

let ColumnDuration;
beforeEach(async () => {
    ddProps = undefined;
    ColumnDuration = (await import("@vueda/objects-grid/ColumnDuration.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/objects-grid/ColumnDuration.vue", () => {
    scopedIt("binds the cell value and the default format to DurationDisplay", () => {
        const wrapper = mount(ColumnDuration, { props: { value: "730 00:00:00" } });
        expect(ddProps.value).toBe("730 00:00:00");
        expect(ddProps.format).toBe("long");
        wrapper.unmount();
    });

    scopedIt("forwards a format override from columnProps", () => {
        const wrapper = mount(ColumnDuration, { props: { value: 90, format: "short" } });
        expect(ddProps.format).toBe("short");
        wrapper.unmount();
    });

    scopedIt.each([
        ["null", null],
        ["undefined", undefined],
        ["an empty string", ""],
    ])("passes %s through unchanged", (_label, value) => {
        const wrapper = mount(ColumnDuration, { props: { value } });
        expect(ddProps.value).toBe(value === undefined ? undefined : value);
        wrapper.unmount();
    });

    scopedIt("does not leak the remaining cell context props onto the display root", () => {
        const wrapper = mount(ColumnDuration, {
            props: { value: 90 },
            attrs: { field: "expected_delivery_time", formatted: "90", obj: { id: 1 } },
        });
        expect(wrapper.get('[data-qa="dd"]').attributes("field")).toBeUndefined();
        wrapper.unmount();
    });
});
