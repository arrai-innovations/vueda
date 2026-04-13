import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Spinner from "@vueda/feedback/spinner/Spinner.vue";
import { defineComponent, h } from "vue";

describe("lib/components/LoadingSpinnerBlock.vue", () => {
    let LoadingSpinnerBlock;

    beforeEach(async () => {
        LoadingSpinnerBlock = (await import("@vueda/components/LoadingSpinnerBlock.vue")).default;
    });

    scopedIt("renders Spinner by default", () => {
        const wrapper = mount(LoadingSpinnerBlock);
        expect(wrapper.findComponent(Spinner).exists()).toBe(true);
    });

    scopedIt("uses injected component when provided", () => {
        const CustomSpinner = defineComponent({
            name: "CustomSpinner",
            setup(_, { attrs }) {
                return () => h("div", { "data-qa": "custom-spinner", ...attrs });
            },
        });
        const wrapper = mount(LoadingSpinnerBlock, {
            global: { provide: { vuedaLoadingSpinnerBlock: CustomSpinner } },
        });
        expect(wrapper.findComponent(CustomSpinner).exists()).toBe(true);
        expect(wrapper.findComponent(Spinner).exists()).toBe(false);
    });
});
