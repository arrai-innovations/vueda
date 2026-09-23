import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { h } from "vue";

const { makeThemeFn, makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const themeFn = makeThemeFn({ slotResolver: (k) => k });
const mockedUseTheme = makeUseThemeMock({ themeFn });
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
    mergeTheme: (...themes) => Object.assign({}, ...themes),
}));
// No registered icons: the SFC falls back to `×`.
vi.mock("@vueda/use/useIcons.js", () => ({ ICON_OVERRIDE_PROPS: {}, useIcons: () => () => null }));

let ScopeChip;

beforeEach(async () => {
    ScopeChip = (await import("@vueda/display/scope/ScopeChip.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
});

describe("lib/display/scope/ScopeChip.vue", () => {
    scopedIt("renders the label as read-only text with a named clear control", () => {
        const wrapper = mount(ScopeChip, { props: { label: "Batch 42" } });
        const label = wrapper.get('[data-qa="scope-chip-label"]');
        expect(label.text()).toBe("Batch 42");
        expect(label.element.tagName).toBe("SPAN");
        expect(wrapper.get('[data-qa="scope-chip-clear"]').attributes("aria-label")).toBe("Clear scope: Batch 42");
        expect(wrapper.get('[data-qa="scope-chip-clear"]').text()).toBe("×");
    });

    scopedIt("omits the clear control when not clearable", () => {
        const wrapper = mount(ScopeChip, { props: { label: "North", clearable: false } });
        expect(wrapper.get('[data-qa="scope-chip-label"]').text()).toBe("North");
        expect(wrapper.find('[data-qa="scope-chip-clear"]').exists()).toBe(false);
    });

    scopedIt("renders default slot content in place of the label text", () => {
        const wrapper = mount(ScopeChip, {
            props: { label: "Batch 42" },
            slots: { default: () => h("strong", { "data-qa": "custom-label" }, "Batch B-42") },
        });
        expect(wrapper.get('[data-qa="custom-label"]').text()).toBe("Batch B-42");
        expect(wrapper.get('[data-qa="scope-chip-label"]').attributes("title")).toBe("Batch 42");
        expect(wrapper.find('[data-qa="scope-chip-clear"]').exists()).toBe(true);
    });

    scopedIt("emits clear from the clear control", async () => {
        const wrapper = mount(ScopeChip, { props: { label: "Batch 42" } });
        await wrapper.get('[data-qa="scope-chip-clear"]').trigger("click");
        expect(wrapper.emitted("clear")).toHaveLength(1);
    });
});
