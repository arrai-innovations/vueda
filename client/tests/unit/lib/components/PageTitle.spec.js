import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { PageTitleContextSymbol } from "@vueda/utils/symbols.js";
import { computed, defineComponent, h, isRef } from "vue";

const { makeThemeFn, makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const themeFn = makeThemeFn({ slotResolver: (key) => `theme-${key}` });
const mockedUseTheme = makeUseThemeMock({ themeFn });

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

let PageTitle;

const makeContext = (entry = {}) => ({
    current: computed(() => entry),
    actionTarget: computed(() => null),
    register: vi.fn(),
    bindActionZone: vi.fn(),
});

const mountWithContext = (context, options = {}) =>
    mount(PageTitle, {
        ...options,
        global: { ...(options.global ?? {}), provide: { [PageTitleContextSymbol]: context } },
    });

beforeEach(async () => {
    themeFn.mockClear();
    mockedUseTheme.mockClear();
    PageTitle = (await import("@vueda/components/PageTitle.vue")).default;
});

describe("lib/components/PageTitle.vue", () => {
    scopedIt("calls useTheme with props and context", () => {
        mountWithContext(makeContext(), { props: { sticky: true } });
        expect(mockedUseTheme).toHaveBeenCalledWith("PageTitle", expect.any(Object), expect.any(Object));
        const context = mockedUseTheme.mock.calls[0][2];
        expect("sticky" in context).toBe(true);
    });

    scopedIt("renders the active view's title from the page-title context", () => {
        const wrapper = mountWithContext(makeContext({ title: "List Suppliers" }));
        expect(wrapper.find("h1").classes()).toContain("theme-title");
        expect(wrapper.find("h1").text()).toContain("List Suppliers");
        expect(wrapper.find('[data-qa="loading-spinner-inline"]').exists()).toBe(false);
    });

    scopedIt("lets a title slot override the context title", () => {
        const wrapper = mountWithContext(makeContext({ title: "Ignored" }), {
            slots: { title: "<span data-qa='custom'>Custom</span>" },
        });
        expect(wrapper.find('[data-qa="custom"]').exists()).toBe(true);
        expect(wrapper.find("h1").text()).not.toContain("Ignored");
    });

    scopedIt("shows the spinner when the active view reports loading", () => {
        const wrapper = mountWithContext(makeContext({ title: "T", loading: true }), { props: { sticky: true } });
        expect(wrapper.find('[data-qa="loading-spinner-inline"]').exists()).toBe(true);
        expect(wrapper.find(".theme-gradient").exists()).toBe(true);
    });

    scopedIt("renders the action zone and binds it to the context", () => {
        const context = makeContext();
        const wrapper = mountWithContext(context);
        expect(wrapper.find('[data-qa="page-title-actions"]').classes()).toContain("theme-buttons");
        expect(context.bindActionZone).toHaveBeenCalledTimes(1);
        expect(isRef(context.bindActionZone.mock.calls[0][0])).toBe(true);
    });

    scopedIt("omits the gradient when not sticky", () => {
        const wrapper = mountWithContext(makeContext({ title: "t" }));
        expect(wrapper.find(".theme-gradient").exists()).toBe(false);
    });
});
