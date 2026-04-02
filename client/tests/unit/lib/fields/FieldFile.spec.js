import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

let vue;
let FieldFile;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    vi.doMock("@vueda/use/useField.js", () => ({
        FIELD_EMITS: [],
        FIELD_PROPS: { label: { type: String, default: null } },
        useField: () => ({ state: vue.reactive({ value: undefined }) }),
    }));
    FieldFile = (await import("@vueda/fields/FieldFile.vue")).default;
});

afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
});

scopedIt("passes slot props and root classes", () => {
    const wrapper = mount(FieldFile, {
        props: { label: "Label" },
        attrs: { class: "outer", id: "fid" },
        slots: {
            default: ({ fieldAttrs, fieldProps }) =>
                vue.h("span", {
                    "data-qa": "slot",
                    "data-id": fieldAttrs.id,
                    "data-label": fieldProps.label,
                }),
        },
    });

    expect(wrapper.classes()).toContain("outer");
    const slotEl = wrapper.get('[data-qa="slot"]');
    expect(slotEl.attributes("data-id")).toBe("fid");
    expect(slotEl.attributes("data-label")).toBe("Label");
});
