import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

const ProgressSpinnerStub = defineComponent({
    name: "ProgressSpinnerStub",
    props: ["ariaLabel", "strokeWidth"],
    setup(props, { attrs }) {
        return () =>
            h("div", {
                "data-qa": "progress-spinner",
                "data-aria-label": props.ariaLabel,
                "data-stroke-width": props.strokeWidth,
                ...attrs,
            });
    },
});
vi.mock("primevue/progressspinner", () => ({ default: ProgressSpinnerStub }));

describe("lib/components/LoadingSpinnerInline.vue", () => {
    let LoadingSpinnerInline;

    beforeEach(async () => {
        LoadingSpinnerInline = (await import("@vueda/components/LoadingSpinnerInline.vue")).default;
    });

    scopedIt("renders primevue spinner by default", () => {
        const wrapper = mount(LoadingSpinnerInline);
        const spinner = wrapper.getComponent(ProgressSpinnerStub);
        expect(spinner.exists()).toBe(true);
        expect(spinner.attributes("data-aria-label")).toBe("Loading...");
        expect(spinner.attributes("data-stroke-width")).toBe("8");
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
        expect(wrapper.findComponent(ProgressSpinnerStub).exists()).toBe(false);
    });
});
