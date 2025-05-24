import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

const ProgressSpinnerStub = defineComponent({
    name: "ProgressSpinnerStub",
    setup(_, { attrs }) {
        return () => h("div", { "data-qa": "progress-spinner", ...attrs });
    },
});

vi.mock("primevue/progressspinner", () => ({ default: ProgressSpinnerStub }));

let LoadingSpinnerBlock;

beforeEach(async () => {
    LoadingSpinnerBlock = (await import("@vueda/components/LoadingSpinnerBlock.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
});

scopedIt("renders ProgressSpinner when no component injected", () => {
    const wrapper = mount(LoadingSpinnerBlock);
    const spinner = wrapper.get('[data-qa="progress-spinner"]');
    expect(spinner.attributes("aria-label")).toBe("Loading...");
    expect(spinner.attributes("stroke-width")).toBe("8");
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
    expect(wrapper.find('[data-qa="custom-spinner"]').exists()).toBe(true);
    expect(wrapper.find('[data-qa="progress-spinner"]').exists()).toBe(false);
});
