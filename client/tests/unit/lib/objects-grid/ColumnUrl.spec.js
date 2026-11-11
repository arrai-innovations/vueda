import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

let displayProps;
const UrlDisplayStub = defineComponent({
    name: "UrlDisplayStub",
    props: { value: null, inline: Boolean },
    setup(props) {
        return () => {
            displayProps = { ...props };
            return h("span", { "data-qa": "display" }, String(props.value));
        };
    },
});
vi.mock("@vueda/display/url-display/UrlDisplay.vue", () => ({ default: UrlDisplayStub }));

let textAttrs;
const ColumnTextStub = defineComponent({
    name: "ColumnTextStub",
    inheritAttrs: false,
    setup(_props, { attrs }) {
        return () => {
            textAttrs = { ...attrs };
            return h("span", { "data-qa": "text" });
        };
    },
});
vi.mock("@vueda/objects-grid/ColumnText.vue", () => ({ default: ColumnTextStub }));

let ColumnUrl;
beforeEach(async () => {
    displayProps = undefined;
    textAttrs = undefined;
    ColumnUrl = (await import("@vueda/objects-grid/ColumnUrl.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/objects-grid/ColumnUrl.vue", () => {
    scopedIt("binds the cell value and renders the inline form", () => {
        const wrapper = mount(ColumnUrl, { props: { value: "https://www.domain.invalid" } });
        expect(displayProps.value).toBe("https://www.domain.invalid");
        expect(displayProps.inline).toBe(true);
        expect(wrapper.find('[data-qa="text"]').exists()).toBe(false);
        wrapper.unmount();
    });

    scopedIt("passes an empty cell through unchanged", () => {
        const wrapper = mount(ColumnUrl, { props: { value: null } });
        expect(displayProps.value).toBe(null);
        wrapper.unmount();
    });

    scopedIt("renders an array from a many-valued field through ColumnText", () => {
        const field = { name: "links", many: true };
        const wrapper = mount(ColumnUrl, {
            props: { value: ["https://www.domain.invalid"], field },
            attrs: { formatted: ["https://www.domain.invalid"] },
        });
        expect(wrapper.find('[data-qa="display"]').exists()).toBe(false);
        expect(textAttrs.formatted).toEqual(["https://www.domain.invalid"]);
        expect(textAttrs.field).toEqual(field);
        wrapper.unmount();
    });

    scopedIt("renders a field with static choices through ColumnText, which shows the labels", () => {
        const field = { name: "contact", displayChoices: [{ value: "https://www.domain.invalid", label: "Sales" }] };
        const wrapper = mount(ColumnUrl, {
            props: { value: "https://www.domain.invalid", field },
            attrs: { formatted: "https://www.domain.invalid" },
        });
        expect(wrapper.find('[data-qa="display"]').exists()).toBe(false);
        expect(textAttrs.field).toEqual(field);
        wrapper.unmount();
    });

    scopedIt("does not leak the remaining cell context props onto the display root", () => {
        const wrapper = mount(ColumnUrl, {
            props: { value: "https://www.domain.invalid" },
            attrs: { formatted: "x", obj: { id: 1 } },
        });
        expect(wrapper.get('[data-qa="display"]').attributes("formatted")).toBeUndefined();
        wrapper.unmount();
    });
});
