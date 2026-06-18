import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";

const { isMobileState } = await vi.hoisted(async () => {
    const { ref: vueRef } = await import("vue");
    return { isMobileState: vueRef(false) };
});

const PassThroughStub = (name) =>
    defineComponent({
        name,
        inheritAttrs: false,
        setup(_, { slots, attrs }) {
            return () => h("div", { ...attrs }, slots.default ? slots.default() : null);
        },
    });

const ButtonStub = defineComponent({
    name: "ButtonStub",
    inheritAttrs: false,
    emits: ["click"],
    setup(_, { emit, slots, attrs }) {
        return () => h("button", { ...attrs, onClick: () => emit("click") }, slots.default ? slots.default() : null);
    },
});

const SortEditorStub = defineComponent({
    name: "SortEditorStub",
    props: ["sortables", "sorted", "fieldDetails"],
    emits: ["update:sorted"],
    setup(_, { slots }) {
        // Render every provided slot (default + named) so forwarded body slots are observable.
        return () =>
            h(
                "div",
                { "data-qa": "sort-editor" },
                Object.values(slots).map((slotFn) => slotFn()),
            );
    },
});

const DialogStub = defineComponent({
    name: "DialogStub",
    inheritAttrs: false,
    props: ["open"],
    emits: ["update:open"],
    setup(_, { slots, attrs }) {
        return () => h("div", { ...attrs }, slots.default ? slots.default() : null);
    },
});

vi.mock("@vueda/components/SortEditor.vue", () => ({ default: SortEditorStub }));
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));
vi.mock("@vueda/shell/popover/Popover.vue", () => ({ default: PassThroughStub("PopoverStub") }));
vi.mock("@vueda/shell/popover/PopoverContent.vue", () => ({ default: PassThroughStub("PopoverContentStub") }));
vi.mock("@vueda/shell/popover/PopoverTrigger.vue", () => ({ default: PassThroughStub("PopoverTriggerStub") }));
vi.mock("@vueda/shell/dialog/Dialog.vue", () => ({ default: DialogStub }));
vi.mock("@vueda/shell/dialog/DialogContent.vue", () => ({ default: PassThroughStub("DialogContentStub") }));
vi.mock("@vueda/shell/dialog/DialogHeader.vue", () => ({ default: PassThroughStub("DialogHeaderStub") }));
vi.mock("@vueda/shell/dialog/DialogTitle.vue", () => ({ default: PassThroughStub("DialogTitleStub") }));
vi.mock("@vueda/shell/dialog/DialogTrigger.vue", () => ({ default: PassThroughStub("DialogTriggerStub") }));
vi.mock("@vueda/use/useIcons.js", () => ({ useIcons: () => () => null }));

vi.mock("@vueuse/core", async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, useBreakpoints: () => ({ smaller: () => isMobileState }) };
});

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({ slotResolver: (key) => key });
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
}));

let SortControl;

beforeEach(async () => {
    isMobileState.value = false;
    SortControl = (await import("@vueda/components/SortControl.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
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
        slots: options.slots,
    });
    return { wrapper };
}

describe("lib/components/SortControl.vue", () => {
    scopedIt("renders the popover shell on desktop and not the dialog", () => {
        isMobileState.value = false;
        const { wrapper } = mountControl();

        expect(wrapper.findComponent({ name: "PopoverStub" }).exists()).toBe(true);
        expect(wrapper.findComponent({ name: "DialogStub" }).exists()).toBe(false);
    });

    scopedIt("renders the full-screen dialog shell on mobile and not the popover", () => {
        isMobileState.value = true;
        const { wrapper } = mountControl();

        expect(wrapper.findComponent({ name: "DialogStub" }).exists()).toBe(true);
        expect(wrapper.findComponent({ name: "PopoverStub" }).exists()).toBe(false);
        expect(wrapper.find('[data-qa="sort-control-dialog-body"]').classes()).toContain("dialogBody");
        expect(wrapper.findComponent({ name: "DialogContentStub" }).classes()).toContain("dialog");
        expect(wrapper.findComponent({ name: "DialogHeaderStub" }).classes()).toContain("dialogHeader");
    });

    scopedIt("shows the active-sort count badge only when sorts are applied", () => {
        const { wrapper } = mountControl({ props: { sorted: ["name", "-created_at"] } });
        expect(wrapper.find('[data-qa="sort-control-count"]').text()).toBe("2");

        const { wrapper: empty } = mountControl({ props: { sorted: [] } });
        expect(empty.find('[data-qa="sort-control-count"]').exists()).toBe(false);
    });

    scopedIt("teleports the trigger into the provided target element", () => {
        const target = document.createElement("div");
        document.body.appendChild(target);

        mountControl({ props: { triggerTarget: target } });

        expect(target.querySelector('[data-qa="sort-control-trigger"]')).not.toBeNull();

        target.remove();
    });

    scopedIt("hosts SortEditor with the sort props forwarded", () => {
        const { wrapper } = mountControl({
            props: {
                sortables: ["name", "created_at", "status"],
                sorted: ["name", "-created_at"],
                fieldDetails: { name: { label: "Name" } },
            },
        });

        const editor = wrapper.findComponent(SortEditorStub);
        expect(editor.exists()).toBe(true);
        expect(editor.props("sortables")).toEqual(["name", "created_at", "status"]);
        expect(editor.props("sorted")).toEqual(["name", "-created_at"]);
        expect(editor.props("fieldDetails")).toEqual({ name: { label: "Name" } });
    });

    scopedIt("re-emits update:sorted raised by the hosted SortEditor", async () => {
        const { wrapper } = mountControl({ props: { sorted: ["name"] } });

        wrapper.findComponent(SortEditorStub).vm.$emit("update:sorted", ["-name"]);
        await wrapper.vm.$nextTick();

        expect(wrapper.emitted()["update:sorted"][0][0]).toEqual(["-name"]);
    });

    scopedIt("opens the dialog when the mobile trigger is clicked", async () => {
        isMobileState.value = true;
        const { wrapper } = mountControl();

        expect(wrapper.findComponent({ name: "DialogStub" }).props("open")).toBe(false);

        await wrapper.find('[data-qa="sort-control-trigger"]').trigger("click");

        expect(wrapper.findComponent({ name: "DialogStub" }).props("open")).toBe(true);
    });

    scopedIt("forwards body slots through to SortEditor", () => {
        isMobileState.value = false;
        const { wrapper } = mountControl({
            slots: {
                "drag-handle": () => h("span", { "data-qa": "custom-drag" }, "drag"),
            },
        });

        expect(wrapper.find('[data-qa="custom-drag"]').exists()).toBe(true);
    });
});
