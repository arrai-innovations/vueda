import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

const SpinnerStub = defineComponent({
    name: "SpinnerStub",
    setup(_, { attrs }) {
        return () => h("div", { "data-qa": "spinner", ...attrs });
    },
});

vi.mock("@vueda/components/LoadingSpinnerBlock.vue", () => ({
    default: SpinnerStub,
}));

let ViewLoading;

beforeEach(async () => {
    ViewLoading = (await import("@vueda/views/ViewLoading.vue")).default;
});

scopedIt("renders the loading spinner component", () => {
    const wrapper = mount(ViewLoading);
    expect(wrapper.findComponent(SpinnerStub).exists()).toBe(true);
});

describe("slowAfterMs prop", () => {
    scopedIt("defaults to 3000 when the CSS variable is not loaded", () => {
        const wrapper = mount(ViewLoading);
        expect(wrapper.props("slowAfterMs")).toBe(3000);
    });

    scopedIt("accepts a numeric override", () => {
        const wrapper = mount(ViewLoading, { props: { slowAfterMs: 5000 } });
        expect(wrapper.props("slowAfterMs")).toBe(5000);
    });

    scopedIt("reads the CSS token when set on documentElement", () => {
        document.documentElement.style.setProperty("--vueda-loading-slow-ms", "8000");
        const wrapper = mount(ViewLoading);
        expect(wrapper.props("slowAfterMs")).toBe(8000);
        document.documentElement.style.removeProperty("--vueda-loading-slow-ms");
    });
});
