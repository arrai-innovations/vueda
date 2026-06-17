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

const ControlSelectStub = defineComponent({
    name: "ControlSelectStub",
    props: ["modelValue"],
    emits: ["update:modelValue"],
    setup(_, { slots, attrs }) {
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
    setup(_, { slots }) {
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

vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));
vi.mock("@vueda/controls/select/Select.vue", () => ({ default: ControlSelectStub }));
vi.mock("@vueda/controls/select/SelectContent.vue", () => ({ default: ControlSelectContentStub }));
vi.mock("@vueda/controls/select/SelectItem.vue", () => ({ default: ControlSelectItemStub }));
vi.mock("@vueda/controls/select/SelectTrigger.vue", () => ({ default: ControlSelectTriggerStub }));
vi.mock("@vueda/controls/select/SelectValue.vue", () => ({ default: ControlSelectValueStub }));
vi.mock("vue-draggable-next", () => ({ VueDraggableNext: DraggableStub }));

const { makeThemeFn, makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const themeMock = makeThemeFn({ slotResolver: (key) => key });
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: makeUseThemeMock({ themeFn: themeMock }),
    THEME_OVERRIDE_PROPS: {},
}));

let SortEditor;

beforeEach(async () => {
    SortEditor = (await import("@vueda/components/SortEditor.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
});

function mountComponent(options = {}) {
    const sorted = ref(options.props?.sorted ?? []);

    const props = {
        sortables: ["name", "created_at"],
        fieldDetails: {},
        sorted: sorted.value,
        "onUpdate:sorted": (value) => {
            sorted.value = value;
            wrapper.setProps({ sorted: value });
        },
        ...options.props,
    };
    const wrapper = mount(SortEditor, {
        props,
        slots: options.slots,
        global: {
            stubs: {
                Button: ButtonStub,
                Select: ControlSelectStub,
                draggable: DraggableStub,
            },
        },
    });

    return { wrapper };
}

describe("lib/components/SortEditor.vue", () => {
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

    scopedIt("derives labels from fieldDetails", () => {
        const { wrapper } = mountComponent({
            props: {
                sorted: ["name", "-created_at"],
                fieldDetails: { name: { label: "Display Name" }, created_at: { label: "Created" } },
            },
        });

        const selectDisplays = wrapper.findAll('[data-qa="select-value"]');

        expect(selectDisplays[0].text()).toBe("Display Name");
        expect(selectDisplays[1].text()).toBe("Created");
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
