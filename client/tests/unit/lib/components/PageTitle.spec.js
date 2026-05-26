import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

const themeFn = vi.fn((key) => `theme-${key}`);
const mockedUseTheme = vi.fn(() => themeFn);

vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
}));

const LoadingSpinnerInlineStub = defineComponent({
    name: "LoadingSpinnerInlineStub",
    setup(_, { attrs }) {
        return () => h("div", { "data-qa": "loading-spinner-inline", ...attrs });
    },
});
vi.mock("@vueda/components/LoadingSpinnerInline.vue", () => ({
    default: LoadingSpinnerInlineStub,
}));

let PageTitle, vue;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    themeFn.mockClear();
    mockedUseTheme.mockClear();
    PageTitle = (await import("@vueda/components/PageTitle.vue")).default;
});

scopedIt("calls useTheme with props and context", () => {
    mount(PageTitle, { props: { headerClass: "h", sticky: true } });
    expect(mockedUseTheme).toHaveBeenCalledWith("PageTitle", expect.any(Object), expect.any(Object));
    const context = mockedUseTheme.mock.calls[0][2];
    expect(vue.isReactive(context)).toBe(true);
    expect("headerClass" in context).toBe(true);
    expect("sticky" in context).toBe(true);
});

scopedIt("applies theme classes and renders slots", () => {
    const wrapper = mount(PageTitle, {
        props: { title: "Hello" },
        slots: {
            title: "<span data-qa='title-slot'>Slot</span>",
            eyebrow: "<span data-qa='eyebrow'>Crumbs</span>",
            "title-suffix": "<span data-qa='suffix'>Sfx</span>",
            button: "<button data-qa='btn'>Btn</button>",
            subtitle: "<div data-qa='subtitle'>Sub</div>",
            "under-actions": "<div data-qa='under'>Under</div>",
            footer: "<div data-qa='footer'>Foot</div>",
        },
    });

    expect(wrapper.classes()).toContain("theme-root");
    expect(wrapper.find("h1").classes()).toContain("theme-title");
    expect(wrapper.find('[data-qa="loading-spinner-inline"]').exists()).toBe(false);
    expect(wrapper.find('[data-qa="title-slot"]').exists()).toBe(true);
    expect(wrapper.find('[data-qa="eyebrow"]').exists()).toBe(true);
    expect(wrapper.find(".theme-eyebrow").exists()).toBe(true);
    expect(wrapper.find(".theme-titleRow").exists()).toBe(true);
    expect(wrapper.find('[data-qa="suffix"]').exists()).toBe(true);
    expect(wrapper.find(".theme-titleSuffix").exists()).toBe(true);
    expect(wrapper.find('[data-qa="btn"]').exists()).toBe(true);
    expect(wrapper.find('[data-qa="subtitle"]').exists()).toBe(true);
    expect(wrapper.find('[data-qa="under"]').exists()).toBe(true);
    expect(wrapper.find('[data-qa="footer"]').exists()).toBe(true);
});

scopedIt("omits eyebrow and titleSuffix wrappers when their slots are not provided", () => {
    const wrapper = mount(PageTitle, { props: { title: "t" } });
    expect(wrapper.find(".theme-eyebrow").exists()).toBe(false);
    expect(wrapper.find(".theme-titleSuffix").exists()).toBe(false);
});

scopedIt("shows spinner and gradient when loading and sticky", () => {
    const wrapper = mount(PageTitle, { props: { title: "T", loading: true, sticky: true } });

    expect(wrapper.find('[data-qa="loading-spinner-inline"]').exists()).toBe(true);
    expect(wrapper.find(".theme-gradient").exists()).toBe(true);
});

scopedIt("renders subtitle container only when slots provided", () => {
    const emptyWrapper = mount(PageTitle, { props: { title: "t" } });
    expect(emptyWrapper.find(".theme-subtitleContainer").exists()).toBe(false);

    const filled = mount(PageTitle, {
        props: { title: "t" },
        slots: { subtitle: "<div />" },
    });
    expect(filled.find(".theme-subtitleContainer").exists()).toBe(true);
});
