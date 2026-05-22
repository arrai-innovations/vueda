import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { setIcons } from "@vueda/use/useIcons.js";
import { defineComponent, h } from "vue";

describe("lib/components/LoadingSpinnerInline.vue", () => {
    let LoadingSpinnerInline;
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
        LoadingSpinnerInline = (await import("@vueda/components/LoadingSpinnerInline.vue")).default;
    });

    scopedIt("renders the configured loading icon", () => {
        const wrapper = mount(LoadingSpinnerInline);
        expect(wrapper.findComponent(LoadingIcon).exists()).toBe(true);
        expect(wrapper.get('[data-qa="loading-icon"]').attributes("spin")).toBe("true");
        expect(wrapper.get('[role="status"]').attributes("aria-label")).toBe("Loading");
    });

    scopedIt("renders a component-specific loading icon when provided", () => {
        const CustomStub = defineComponent({
            name: "CustomStub",
            setup(_, { attrs }) {
                return () => h("div", { "data-qa": "custom-spinner", ...attrs });
            },
        });
        setIcons({
            LoadingSpinnerInline: {
                loading: { component: CustomStub, props: { spin: true } },
            },
            Default: {
                loading: { component: LoadingIcon },
            },
        });
        const wrapper = mount(LoadingSpinnerInline, {
            global: { provide: {} },
        });
        expect(wrapper.findComponent(CustomStub).exists()).toBe(true);
        expect(wrapper.findComponent(LoadingIcon).exists()).toBe(false);
    });
});
