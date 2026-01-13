import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

let vue;
let FieldFile;
let fieldState;
let ignoreFn;
let removeIgnoreFn;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    fieldState = vue.reactive({ value: undefined });
    ignoreFn = vi.fn();
    removeIgnoreFn = vi.fn();
    vi.doMock("@vueda/use/useField.js", () => ({
        FIELD_EMITS: [],
        FIELD_PROPS: { label: { type: String, default: null } },
        useField: () => ({ state: fieldState, ignore: ignoreFn, removeIgnore: removeIgnoreFn }),
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

scopedIt("handles ignore state based on value", async () => {
    mount(FieldFile);
    expect(removeIgnoreFn).toHaveBeenCalledTimes(1);

    removeIgnoreFn.mockClear();
    fieldState.value = { a: 1 };
    await vue.nextTick();
    expect(ignoreFn).toHaveBeenCalledTimes(1);
    expect(removeIgnoreFn).not.toHaveBeenCalled();

    ignoreFn.mockClear();
    fieldState.value = new File(["x"], "x.txt");
    await vue.nextTick();
    expect(removeIgnoreFn).toHaveBeenCalledTimes(1);
    expect(ignoreFn).not.toHaveBeenCalled();
});
