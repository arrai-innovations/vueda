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

vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));
vi.mock("@vueda/shell/drawer/Drawer.vue", () => ({ default: ShellDrawerStub }));
vi.mock("@vueda/shell/drawer/DrawerContent.vue", () => ({ default: ShellDrawerContentStub }));
vi.mock("@vueda/shell/drawer/DrawerHeader.vue", () => ({ default: ShellDrawerHeaderStub }));
vi.mock("@vueda/shell/drawer/DrawerTitle.vue", () => ({ default: ShellDrawerTitleStub }));
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

let MobileSortComponent;
let SortEditor;

beforeEach(async () => {
    MobileSortComponent = (await import("@vueda/components/MobileSortComponent.vue")).default;
    SortEditor = (await import("@vueda/components/SortEditor.vue")).default;
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
                Button: ButtonStub,
                Drawer: ShellDrawerStub,
                DrawerContent: ShellDrawerContentStub,
                DrawerHeader: ShellDrawerHeaderStub,
                DrawerTitle: ShellDrawerTitleStub,
                Select: ControlSelectStub,
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

    scopedIt("shows a badge with the applied sort count on the trigger", () => {
        const { wrapper } = mountComponent({
            props: {
                sorted: ["name", "-created_at"],
            },
        });

        const sortBtn = wrapper.findAll('[data-qa="button"]').find((b) => b.text().includes("Sort"));
        expect(sortBtn.text()).toContain("2");
    });

    scopedIt("hosts SortEditor with the sort props forwarded", () => {
        const { wrapper } = mountComponent({
            props: {
                sortables: ["name", "created_at", "status"],
                sorted: ["name", "-created_at"],
                fieldDetails: { name: { label: "Name" } },
            },
        });

        const editor = wrapper.findComponent(SortEditor);
        expect(editor.exists()).toBe(true);
        expect(editor.props("sortables")).toEqual(["name", "created_at", "status"]);
        expect(editor.props("sorted")).toEqual(["name", "-created_at"]);
        expect(editor.props("fieldDetails")).toEqual({ name: { label: "Name" } });
    });

    scopedIt("re-emits update:sorted raised by the hosted SortEditor", async () => {
        const { wrapper } = mountComponent({
            props: {
                sorted: ["name"],
            },
        });

        wrapper.findComponent(SortEditor).vm.$emit("update:sorted", ["-name"]);
        await wrapper.vm.$nextTick();

        expect(wrapper.emitted()["update:sorted"][0][0]).toEqual(["-name"]);
    });

    scopedIt("forwards body slots through to SortEditor", () => {
        const { wrapper } = mountComponent({
            props: {
                sorted: ["name"],
            },
            slots: {
                "drag-handle": () => h("span", { "data-qa": "custom-drag" }, "drag"),
            },
        });

        expect(wrapper.find('[data-qa="custom-drag"]').exists()).toBe(true);
    });
});
