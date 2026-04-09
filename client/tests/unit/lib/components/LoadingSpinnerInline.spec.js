import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import FeedbackSpinner from "@vueda/feedback/spinner/FeedbackSpinner.vue";
import { defineComponent, h } from "vue";

describe("lib/components/LoadingSpinnerInline.vue", () => {
    let LoadingSpinnerInline;

    beforeEach(async () => {
        LoadingSpinnerInline = (await import("@vueda/components/LoadingSpinnerInline.vue")).default;
    });

    scopedIt("renders FeedbackSpinner by default", () => {
        const wrapper = mount(LoadingSpinnerInline);
        expect(wrapper.findComponent(FeedbackSpinner).exists()).toBe(true);
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
        expect(wrapper.findComponent(FeedbackSpinner).exists()).toBe(false);
    });
});
