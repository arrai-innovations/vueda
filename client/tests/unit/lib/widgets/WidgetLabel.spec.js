import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { WidgetContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

// simple stub for FormHiddenFeedback
const SimpleStub = (qa) =>
    defineComponent({
        name: `${qa}-stub`,
        setup(_, { slots }) {
            return () => h("div", { "data-qa": qa }, slots.default ? slots.default() : null);
        },
    });

vi.mock("@vueda/components/FormHiddenFeedback.vue", async () => {
    const actual = await vi.importActual("@vueda/components/FormHiddenFeedback.vue");
    return { ...actual, default: SimpleStub("form-hidden-feedback") };
});
vi.mock("@vueda/use/useWidgetTheme.js", () => ({ useWidgetTheme: () => () => "theme" }));

const importComponent = () => import("@vueda/widgets/WidgetLabel.vue");

let WidgetLabel;

function mountWithContext(props = {}, contextState = {}) {
    const widgetContext = {
        state: reactive({
            required: false,
            readOnly: false,
            combinedLabel: "context label",
            validationState: { valid: true },
            help: undefined,
            ...contextState,
        }),
    };
    return mount(WidgetLabel, {
        props,
        global: {
            provide: { [WidgetContextSymbol]: widgetContext },
        },
    });
}

beforeEach(async () => {
    WidgetLabel = (await importComponent()).default;
});

describe("lib/widgets/WidgetLabel.vue", () => {
    scopedIt("uses label from context and shows required indicator", async () => {
        const wrapper = mountWithContext({}, { required: true });
        const label = wrapper.get("label");
        expect(label.text()).toContain("context label");
        expect(wrapper.find("[title='Required']").exists()).toBe(true);
    });

    scopedIt("hides required indicator when readOnly or hidden", async () => {
        const wrapper = mountWithContext({ hidden: true }, { required: true });
        expect(wrapper.find("[title='Required']").exists()).toBe(false);
        wrapper.unmount();
        const wrapper2 = mountWithContext({}, { required: true, readOnly: true });
        expect(wrapper2.find("[title='Required']").exists()).toBe(false);
    });

    scopedIt("skips feedback when skipFeedback=true", async () => {
        const wrapper = mountWithContext({ skipFeedback: true });
        expect(wrapper.find("[data-qa='form-hidden-feedback']").exists()).toBe(false);
    });

    scopedIt("renders feedback when skipFeedback=false", async () => {
        const wrapper = mountWithContext();
        expect(wrapper.find("[data-qa='form-hidden-feedback']").exists()).toBe(true);
    });
});
