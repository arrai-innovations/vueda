import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

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

const DialogStub = defineComponent({
    name: "DialogStub",
    inheritAttrs: false,
    props: ["open"],
    emits: ["update:open"],
    setup(_, { slots, attrs }) {
        return () => h("div", { ...attrs }, slots.default ? slots.default() : null);
    },
});

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

let ResponsiveMenu;

beforeEach(async () => {
    isMobileState.value = false;
    ResponsiveMenu = (await import("@vueda/components/ResponsiveMenu.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
});

function mountMenu(props = {}) {
    return mount(ResponsiveMenu, {
        props: { label: "Sort", triggerQa: "sort-control-trigger", contentQa: "sort-control-content", ...props },
        slots: { default: () => h("div", { "data-qa": "menu-body" }, "body") },
    });
}

describe("lib/components/ResponsiveMenu.vue", () => {
    scopedIt("renders the popover shell on desktop and not the dialog", () => {
        isMobileState.value = false;
        const wrapper = mountMenu();
        expect(wrapper.findComponent({ name: "PopoverStub" }).exists()).toBe(true);
        expect(wrapper.findComponent({ name: "DialogStub" }).exists()).toBe(false);
        expect(wrapper.find('[data-qa="menu-body"]').exists()).toBe(true);
    });

    scopedIt("renders the full-screen dialog shell on mobile and not the popover", () => {
        isMobileState.value = true;
        const wrapper = mountMenu();
        expect(wrapper.findComponent({ name: "DialogStub" }).exists()).toBe(true);
        expect(wrapper.findComponent({ name: "PopoverStub" }).exists()).toBe(false);
        expect(wrapper.findComponent({ name: "DialogContentStub" }).classes()).toContain("dialog");
        expect(wrapper.find('[data-qa="menu-body"]').exists()).toBe(true);
    });

    scopedIt("teleports the trigger into the provided target element", () => {
        const target = document.createElement("div");
        document.body.appendChild(target);
        mountMenu({ triggerTarget: target });
        expect(target.querySelector('[data-qa="sort-control-trigger"]')).not.toBeNull();
        target.remove();
    });

    scopedIt("opens the dialog when the mobile trigger is clicked", async () => {
        isMobileState.value = true;
        const wrapper = mountMenu();
        expect(wrapper.findComponent({ name: "DialogStub" }).props("open")).toBe(false);
        await wrapper.find('[data-qa="sort-control-trigger"]').trigger("click");
        expect(wrapper.findComponent({ name: "DialogStub" }).props("open")).toBe(true);
    });
});
