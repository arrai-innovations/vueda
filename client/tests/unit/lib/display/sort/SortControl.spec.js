import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";

// The responsive shell and the field list are tested in their own specs; here we
// stub them and verify SortControl's own job: mapping sortables to add-options and
// appending the picked field.
const ResponsiveMenuStub = defineComponent({
    name: "ResponsiveMenuStub",
    props: ["icon", "label", "title", "triggerTarget", "triggerQa", "contentQa"],
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "responsive-menu" }, slots.default ? slots.default() : null);
    },
});

const FieldPickerMenuListStub = defineComponent({
    name: "FieldPickerMenuListStub",
    props: ["items", "eyebrow", "emptyText", "itemIcon", "qa"],
    emits: ["pick"],
    setup(props, { emit }) {
        return () =>
            h(
                "div",
                { "data-qa": "field-picker", "data-empty": props.emptyText },
                props.items.map((opt) =>
                    h("button", { "data-qa": `${props.qa}-item`, onClick: () => emit("pick", opt.value) }, opt.label),
                ),
            );
    },
});

vi.mock("@vueda/display/responsive-menu/ResponsiveMenu.vue", () => ({ default: ResponsiveMenuStub }));
vi.mock("@vueda/display/field-picker/FieldPickerMenuList.vue", () => ({ default: FieldPickerMenuListStub }));

let SortControl;

beforeEach(async () => {
    SortControl = (await import("@vueda/display/sort/SortControl.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
});

function mountControl(options = {}) {
    const sorted = ref(options.props?.sorted ?? []);
    const wrapper = mount(SortControl, {
        props: {
            sortables: ["name", "created_at"],
            fieldDetails: {},
            sorted: sorted.value,
            "onUpdate:sorted": (value) => {
                sorted.value = value;
                wrapper.setProps({ sorted: value });
            },
            ...options.props,
        },
    });
    return { wrapper };
}

describe("lib/display/sort/SortControl.vue", () => {
    scopedIt("presents the add-field list inside the responsive menu", () => {
        const { wrapper } = mountControl();
        expect(wrapper.findComponent(ResponsiveMenuStub).exists()).toBe(true);
        expect(wrapper.findComponent(ResponsiveMenuStub).props("triggerQa")).toBe("sort-control-trigger");
        expect(wrapper.findComponent(FieldPickerMenuListStub).exists()).toBe(true);
    });

    scopedIt("offers only the sortable fields not yet in the sort, labeled", () => {
        const { wrapper } = mountControl({
            props: {
                sortables: ["name", "created_at", "status"],
                sorted: ["name"],
                fieldDetails: { created_at: { label: "Created" } },
            },
        });
        const list = wrapper.findComponent(FieldPickerMenuListStub);
        expect(list.props("items")).toEqual([
            { value: "created_at", label: "Created" },
            { value: "status", label: "Status" },
        ]);
    });

    scopedIt("appends the picked field to the sort", async () => {
        const { wrapper } = mountControl({ props: { sorted: ["name"] } });
        await wrapper.findAll('[data-qa="sort-add-menu-item"]')[0].trigger("click");
        expect(wrapper.emitted()["update:sorted"][0][0]).toEqual(["name", "created_at"]);
    });

    scopedIt("does not append a field already in the sort", async () => {
        const { wrapper } = mountControl({ props: { sorted: ["name"] } });
        // Picking a field that is already sorted is a no-op (defensive guard).
        wrapper.findComponent(FieldPickerMenuListStub).vm.$emit("pick", "name");
        expect(wrapper.emitted()["update:sorted"]).toBeUndefined();
    });
});
