import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

let dtdProps;
const DateTimeDisplayStub = defineComponent({
    name: "DateTimeDisplayStub",
    props: ["value", "format", "showTime", "showRelative", "showTooltip", "tooltipFormat", "inline"],
    setup(props) {
        return () => {
            dtdProps = { ...props };
            return h("span", { "data-qa": "dtd" }, String(props.value));
        };
    },
});
vi.mock("@vueda/components/DateTimeDisplay.vue", () => ({ default: DateTimeDisplayStub }));

let ColumnDateTime;
beforeEach(async () => {
    dtdProps = undefined;
    ColumnDateTime = (await import("@vueda/components/ColumnDateTime.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/components/ColumnDateTime.vue", () => {
    scopedIt("binds the cell value and table-friendly defaults to DateTimeDisplay", () => {
        const wrapper = mount(ColumnDateTime, { props: { value: "2024-01-15T10:30:00Z" } });
        expect(dtdProps.value).toBe("2024-01-15T10:30:00Z");
        expect(dtdProps.format).toBe("absolute");
        expect(dtdProps.showTime).toBe(true);
        expect(dtdProps.showRelative).toBe(true);
        wrapper.unmount();
    });

    scopedIt("forwards a showTime:false override (DateField default)", () => {
        const wrapper = mount(ColumnDateTime, { props: { value: "2024-01-15", showTime: false } });
        expect(dtdProps.showTime).toBe(false);
        wrapper.unmount();
    });

    scopedIt("forwards the time-only configuration (TimeField default)", () => {
        const wrapper = mount(ColumnDateTime, {
            props: { value: "14:30:00", format: "t", showRelative: false, showTooltip: false },
        });
        expect(dtdProps.format).toBe("t");
        expect(dtdProps.showRelative).toBe(false);
        expect(dtdProps.showTooltip).toBe(false);
        wrapper.unmount();
    });

    scopedIt("does not leak surplus cell-context props as DOM attributes", () => {
        const wrapper = mount(ColumnDateTime, {
            props: { value: "2024-01-15" },
            attrs: { "data-formatted": "Jan 15, 2024", "data-field": "created" },
        });
        const stub = wrapper.find('[data-qa="dtd"]');
        expect(stub.attributes("data-formatted")).toBeUndefined();
        expect(stub.attributes("data-field")).toBeUndefined();
        wrapper.unmount();
    });
});
