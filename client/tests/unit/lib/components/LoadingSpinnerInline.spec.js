import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Spinner from "@vueda/feedback/spinner/Spinner.vue";
import { defineComponent, h } from "vue";

describe("lib/components/LoadingSpinnerInline.vue", () => {
    let LoadingSpinnerInline;

    beforeEach(async () => {
        LoadingSpinnerInline = (await import("@vueda/components/LoadingSpinnerInline.vue")).default;
    });

    scopedIt("renders Spinner by default", () => {
        const wrapper = mount(LoadingSpinnerInline);
        expect(wrapper.findComponent(Spinner).exists()).toBe(true);
    });

    scopedIt("renders provided spinner component", () => {
        const CustomStub = defineComponent({
            name: "CustomStub",
            setup(_, { attrs }) {
                return () => h("div", { "data-qa": "custom-spinner", ...attrs });
            },
        });
        const wrapper = mount(LoadingSpinnerInline, {
            global: { provide: { vuedaLoadingSpinnerInline: CustomStub } },
        });
        expect(wrapper.findComponent(CustomStub).exists()).toBe(true);
        expect(wrapper.findComponent(Spinner).exists()).toBe(false);
    });
});
