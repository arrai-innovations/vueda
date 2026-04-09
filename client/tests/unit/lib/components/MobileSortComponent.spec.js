import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";

const ButtonStub = defineComponent({
    name: "ButtonStub",
    emits: ["click"],
    setup(_, { attrs, slots, emit }) {
        return () =>
            h(
                "button",
                {
                    "data-qa": "button",
                    ...attrs,
                    onClick: (event) => emit("click", event),
                },
                slots.default ? slots.default() : null,
            );
    },
});

const ShellDrawerStub = defineComponent({
    name: "ShellDrawerStub",
    props: ["open"],
    emits: ["update:open"],
    setup(props, { slots, attrs }) {
        return () =>
            h(
                "div",
                {
                    "data-qa": "drawer",
                    "data-open": props.open,
                    ...attrs,
                },
                slots.default ? slots.default() : null,
            );
    },
});

const ShellDrawerContentStub = defineComponent({
    name: "ShellDrawerContentStub",
    setup(_, { slots }) {
        return () => h("div", null, slots.default?.());
    },
});

const ShellDrawerHeaderStub = defineComponent({
    name: "ShellDrawerHeaderStub",
    setup(_, { slots }) {
        return () => h("div", null, slots.default?.());
    },
});

const ShellDrawerTitleStub = defineComponent({
    name: "ShellDrawerTitleStub",
    setup(_, { slots }) {
        return () => h("div", null, slots.default?.());
    },
});

const ControlSelectStub = defineComponent({
    name: "ControlSelectStub",
    props: ["modelValue"],
    emits: ["update:modelValue"],
    setup(props, { slots, attrs }) {
        return () => h("div", { ...attrs }, slots.default?.());
    },
});

const ControlSelectTriggerStub = defineComponent({
    name: "ControlSelectTriggerStub",
    setup(_, { slots, attrs }) {
        return () => h("div", { ...attrs }, slots.default?.());
    },
});

const ControlSelectValueStub = defineComponent({
    name: "ControlSelectValueStub",
    setup(_, { slots, attrs }) {
        return () => h("div", { "data-qa": "select-value", ...attrs }, slots.default?.());
    },
});

const ControlSelectContentStub = defineComponent({
    name: "ControlSelectContentStub",
    setup(_, { slots }) {
        return () => h("div", null, slots.default?.());
    },
});

const ControlSelectItemStub = defineComponent({
    name: "ControlSelectItemStub",
    props: ["value"],
    setup(_, { slots }) {
        return () => h("div", null, slots.default?.());
    },
});

const DraggableStub = defineComponent({
    name: "DraggableStub",
    props: ["modelValue"],
    emits: ["update:modelValue"],
    setup(props, { slots }) {
        return () =>
            h(
                "div",
                {
                    "data-qa": "draggable",
                },
                slots.default ? slots.default() : null,
            );
    },
});

vi.mock("@vueda/controls/button", () => ({ ControlButton: ButtonStub }));
vi.mock("@vueda/shell/drawer", () => ({
    ShellDrawer: ShellDrawerStub,
    ShellDrawerContent: ShellDrawerContentStub,
    ShellDrawerHeader: ShellDrawerHeaderStub,
    ShellDrawerTitle: ShellDrawerTitleStub,
}));
vi.mock("@vueda/controls/select", () => ({
    ControlSelect: ControlSelectStub,
    ControlSelectContent: ControlSelectContentStub,
    ControlSelectItem: ControlSelectItemStub,
    ControlSelectTrigger: ControlSelectTriggerStub,
    ControlSelectValue: ControlSelectValueStub,
}));
vi.mock("vue-draggable-next", () => ({ VueDraggableNext: DraggableStub }));

const themeMock = vi.fn((key) => key);
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: () => themeMock }));

let MobileSortComponent;

beforeEach(async () => {
    MobileSortComponent = (await import("@vueda/components/MobileSortComponent.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
});

function mountComponent(options = {}) {
    const sorted = ref(options.props?.sorted ?? []);
    const open = ref(options.props?.open ?? false);

    const props = {
        sortables: ["name", "created_at"],
        fieldDetails: {},
        sorted: sorted.value,
        open: open.value,
        "onUpdate:sorted": (value) => {
            sorted.value = value;
            wrapper.setProps({ sorted: value });
        },
        "onUpdate:open": (value) => {
            open.value = value;
            wrapper.setProps({ open: value });
        },
        ...options.props,
    };
    const wrapper = mount(MobileSortComponent, {
        props,
        slots: options.slots,
        global: {
            stubs: {
                ControlButton: ButtonStub,
                ShellDrawer: ShellDrawerStub,
                ShellDrawerContent: ShellDrawerContentStub,
                ShellDrawerHeader: ShellDrawerHeaderStub,
                ShellDrawerTitle: ShellDrawerTitleStub,
                ControlSelect: ControlSelectStub,
                draggable: DraggableStub,
            },
        },
    });

    return { wrapper };
}

describe("lib/components/MobileSortComponent.vue", () => {
    scopedIt("emits open updates through the computed proxy", async () => {
        const { wrapper } = mountComponent();

        wrapper.vm.internalOpen = true;
        expect(wrapper.emitted()["update:open"][0]).toEqual([true]);

        wrapper.vm.internalOpen = false;
        expect(wrapper.emitted()["update:open"][1]).toEqual([false]);
    });

    scopedIt("opens and closes the drawer via the toggle button interactions", async () => {
        const { wrapper } = mountComponent();

        const drawer = () => wrapper.find('[data-qa="sort-component-drawer"]');

        expect(drawer().attributes("data-open")).toBe("false");

        await wrapper
            .findAll('[data-qa="button"]')
            .find((b) => b.text().includes("Sort"))
            .trigger("click");
        await wrapper.vm.$nextTick();
        expect(drawer().attributes("data-open")).toBe("true");

        wrapper.findComponent(ShellDrawerStub).vm.$emit("update:open", false);
        await wrapper.vm.$nextTick();
        expect(drawer().attributes("data-open")).toBe("false");
    });

    scopedIt("manages the sorted list when adding, toggling, and removing entries", async () => {
        const { wrapper } = mountComponent({
            props: {
                sortables: ["name", "created_at", "status"],
                sorted: ["name"],
                fieldDetails: { name: { label: "Name" }, created_at: {}, status: {} },
            },
        });

        wrapper.vm.addSortable();
        const addedSorted = wrapper.emitted()["update:sorted"][0][0];
        expect(addedSorted).toEqual(["name", "created_at"]);
        wrapper.setProps({ sorted: addedSorted });
        await wrapper.vm.$nextTick();

        wrapper.vm.toggleDirection(0);
        const toggledSorted = wrapper.emitted()["update:sorted"][1][0];
        expect(toggledSorted).toEqual(["-name", "created_at"]);
        wrapper.setProps({ sorted: toggledSorted });
        await wrapper.vm.$nextTick();

        wrapper.vm.removeSortable(1);
        const removedSorted = wrapper.emitted()["update:sorted"][2][0];
        expect(removedSorted).toEqual(["-name"]);
        wrapper.setProps({ sorted: removedSorted });
        await wrapper.vm.$nextTick();
        wrapper.vm.clearAll();
        expect(wrapper.emitted()["update:sorted"][3][0]).toEqual([]);
    });

    scopedIt("does nothing when actions are invoked without available sortables", async () => {
        const { wrapper } = mountComponent({
            props: {
                sortables: [],
                sorted: [],
            },
        });

        wrapper.vm.addSortable();
        wrapper.vm.clearAll();
        wrapper.vm.toggleDirection(0);

        expect(wrapper.emitted()["update:sorted"]).toBeUndefined();
    });

    scopedIt("disables the Clear all button when there are no sorted fields", () => {
        const { wrapper } = mountComponent({
            props: {
                sorted: [],
            },
        });

        const clearButton = wrapper.findAll('[data-qa="button"]').find((b) => b.text().includes("Clear all"));
        expect(clearButton.attributes("disabled")).toBeDefined();
    });

    scopedIt("disables the Add Sort button when no sortable options remain", () => {
        const { wrapper } = mountComponent({
            props: {
                sortables: ["name"],
                sorted: ["name"],
            },
        });

        const addButton = wrapper.findAll('[data-qa="button"]').find((b) => b.text().includes("Add Sort"));
        expect(addButton.attributes("disabled")).toBeDefined();
    });

    scopedIt("emits reordered sorting when dragging items", async () => {
        const { wrapper } = mountComponent({
            props: {
                sorted: ["name", "created_at"],
            },
        });

        wrapper.findComponent(DraggableStub).vm.$emit("update:modelValue", ["created_at", "name"]);
        await wrapper.vm.$nextTick();

        expect(wrapper.emitted()["update:sorted"][0][0]).toEqual(["created_at", "name"]);
    });

    scopedIt("derives labels from fieldDetails and shows a badge for applied sorts", () => {
        const { wrapper } = mountComponent({
            props: {
                sorted: ["name", "-created_at"],
                fieldDetails: { name: { label: "Display Name" }, created_at: { label: "Created" } },
            },
        });

        const selectDisplays = wrapper.findAll('[data-qa="select-value"]');

        expect(selectDisplays[0].text()).toBe("Display Name");
        expect(selectDisplays[1].text()).toBe("Created");
        const sortBtn = wrapper.findAll('[data-qa="button"]').find((b) => b.text().includes("Sort"));
        expect(sortBtn.text()).toContain("2");
    });

    scopedIt("does not emit add events when all sortables are already selected", () => {
        const { wrapper } = mountComponent({
            props: {
                sortables: ["name", "created_at"],
                sorted: ["name", "-created_at"],
            },
        });

        wrapper.vm.addSortable();

        expect(wrapper.emitted()["update:sorted"]).toBeUndefined();
    });

    scopedIt("emits updated sorting when a selection is changed", async () => {
        const { wrapper } = mountComponent({
            props: {
                sortables: ["name", "created_at"],
                sorted: ["-name"],
            },
        });

        await wrapper.findComponent(ControlSelectStub).vm.$emit("update:modelValue", "created_at");

        expect(wrapper.emitted()["update:sorted"][0][0]).toEqual(["created_at"]);
    });

    scopedIt("respects custom slots while preserving emissions", async () => {
        const { wrapper } = mountComponent({
            props: {
                sorted: ["name"],
            },
            slots: {
                "drag-handle": ({ onClick }) => h("button", { "data-qa": "custom-drag", onClick }, "drag"),
                "toggle-order-button": ({ onClick, label }) =>
                    h("button", { "data-qa": "custom-toggle", onClick }, label),
                "remove-sort-button": ({ onClick }) => h("button", { "data-qa": "custom-remove", onClick }, "x"),
            },
        });

        await wrapper.find('[data-qa="custom-toggle"]').trigger("click");
        await wrapper.find('[data-qa="custom-remove"]').trigger("click");

        expect(wrapper.emitted()["update:sorted"][0][0]).toEqual(["-name"]);
        expect(wrapper.emitted()["update:sorted"][1][0]).toEqual([]);
    });
});
