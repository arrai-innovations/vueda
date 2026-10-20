import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

let fdProps;
const FileDisplayStub = defineComponent({
    name: "FileDisplayStub",
    props: { value: null, inline: Boolean },
    setup(props) {
        return () => {
            fdProps = { ...props };
            return h("span", { "data-qa": "fd" }, JSON.stringify(props.value ?? null));
        };
    },
});
vi.mock("@vueda/display/file-display/FileDisplay.vue", () => ({ default: FileDisplayStub }));

let ColumnFile;
beforeEach(async () => {
    fdProps = undefined;
    ColumnFile = (await import("@vueda/objects-grid/ColumnFile.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/objects-grid/ColumnFile.vue", () => {
    scopedIt("binds the cell value and renders the inline form", () => {
        const value = { name: "manuals/guide.pdf", url: "https://files.domain.invalid/manuals/guide.pdf" };
        const wrapper = mount(ColumnFile, { props: { value } });
        expect(fdProps.value).toEqual(value);
        expect(fdProps.inline).toBe(true);
        wrapper.unmount();
    });

    scopedIt("passes an empty cell through unchanged", () => {
        const wrapper = mount(ColumnFile, { props: { value: null } });
        expect(fdProps.value).toBe(null);
        wrapper.unmount();
    });

    scopedIt("does not leak the remaining cell context props onto the display root", () => {
        const wrapper = mount(ColumnFile, {
            props: { value: "https://files.domain.invalid/a.pdf" },
            attrs: { field: "manual", formatted: "x", obj: { id: 1 } },
        });
        expect(wrapper.get('[data-qa="fd"]').attributes("field")).toBeUndefined();
        wrapper.unmount();
    });
});
