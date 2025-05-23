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
