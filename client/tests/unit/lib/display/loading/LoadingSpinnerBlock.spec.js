import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { setIcons } from "@vueda/use/useIcons.js";
import { defineComponent, h } from "vue";

describe("lib/display/loading/LoadingSpinnerBlock.vue", () => {
    let LoadingSpinnerBlock;
    const LoadingIcon = defineComponent({
        name: "LoadingIcon",
        setup(_, { attrs }) {
            return () => h("i", { "data-qa": "loading-icon", ...attrs });
        },
    });

    beforeEach(async () => {
        setIcons({
            Default: {
                loading: { component: LoadingIcon, props: { spin: true } },
            },
        });
        LoadingSpinnerBlock = (await import("@vueda/display/loading/LoadingSpinnerBlock.vue")).default;
    });

    scopedIt("renders the configured loading icon", () => {
        const wrapper = mount(LoadingSpinnerBlock);
        expect(wrapper.findComponent(LoadingIcon).exists()).toBe(true);
    });

    scopedIt("uses component-specific icon entries when provided", () => {
        const CustomSpinner = defineComponent({
            name: "CustomSpinner",
            setup(_, { attrs }) {
                return () => h("div", { "data-qa": "custom-spinner", ...attrs });
            },
        });
        setIcons({
            LoadingSpinnerBlock: {
                loading: { component: CustomSpinner },
            },
            Default: {
                loading: { component: LoadingIcon },
            },
        });
        const wrapper = mount(LoadingSpinnerBlock);
        expect(wrapper.findComponent(CustomSpinner).exists()).toBe(true);
        expect(wrapper.findComponent(LoadingIcon).exists()).toBe(false);
    });
});
