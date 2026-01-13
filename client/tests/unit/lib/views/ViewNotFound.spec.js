import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, ref } from "vue";

const mockedUseSuggestRoute = vi.fn();
vi.mock("@vueda/use/useSuggestRoute.js", () => ({
    useSuggestRoute: mockedUseSuggestRoute,
}));

const mockedUseRouter = vi.fn();
vi.mock("vue-router", () => ({
    useRouter: mockedUseRouter,
}));

let ViewNotFound;

beforeEach(async () => {
    ViewNotFound = (await import("@vueda/views/ViewNotFound.vue")).default;
    vi.clearAllMocks();
});

scopedIt("displays current path without suggestion", () => {
    mockedUseRouter.mockReturnValue({
        currentRoute: { value: { path: "/missing" } },
    });
    mockedUseSuggestRoute.mockReturnValue(ref(null));

    const RouterLinkStub = defineComponent({
        name: "RouterLinkStub",
        props: ["to", "custom"],
        setup(props, { slots }) {
            return () => slots.default({ href: props.to });
        },
    });

    const wrapper = mount(ViewNotFound, {
        global: { stubs: { RouterLink: RouterLinkStub } },
    });

    expect(wrapper.text()).toContain("/missing");
    expect(wrapper.find("a").exists()).toBe(false);
});

scopedIt("links to suggested route when available", async () => {
    mockedUseRouter.mockReturnValue({
        currentRoute: { value: { path: "/missing" } },
    });
    const navigate = vi.fn();
    mockedUseSuggestRoute.mockReturnValue(ref("/suggested"));

    const RouterLinkStub = defineComponent({
        name: "RouterLinkStub",
        props: ["to", "custom"],
        setup(props, { slots }) {
            return () =>
                slots.default({
                    href: props.to,
                    navigate: (e) => {
                        e.preventDefault();
                        navigate(e);
                    },
                });
        },
    });

    const wrapper = mount(ViewNotFound, {
        global: { stubs: { RouterLink: RouterLinkStub } },
    });

    const link = wrapper.find("a");
    expect(link.attributes("href")).toBe("/suggested");
    expect(link.find("code").text()).toBe("/suggested");
    await link.trigger("click.prevent");
    expect(navigate).toHaveBeenCalled();
});
