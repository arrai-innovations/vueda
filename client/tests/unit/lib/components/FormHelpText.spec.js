import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h } from "vue";

const sanitizeMessage = vi.fn((msg) => `${msg}`);
const containsHtml = vi.fn(() => false);
const useTheme = vi.fn(() => () => "root-class");

const FeedbackAlertStub = defineComponent({
    name: "FeedbackAlertStub",
    props: ["variant"],
    setup(_, { attrs, slots }) {
        return () => h("div", { "data-qa": "feedback-alert", ...attrs }, slots.default ? slots.default() : null);
    },
});
const FeedbackAlertDescriptionStub = defineComponent({
    name: "FeedbackAlertDescriptionStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "feedback-alert-description" }, slots.default ? slots.default() : null);
    },
});

vi.mock("@vueda/feedback/alert/Alert.vue", () => ({ default: FeedbackAlertStub }));
vi.mock("@vueda/feedback/alert/AlertDescription.vue", () => ({ default: FeedbackAlertDescriptionStub }));
vi.mock("@vueda/utils/html.js", () => ({ sanitizeMessage, containsHtml }));
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme, THEME_OVERRIDE_PROPS: {} }));

describe("lib/components/FormHelpText.vue", () => {
    let FormHelpText;
    beforeEach(async () => {
        vi.clearAllMocks();
        FormHelpText = (await import("@vueda/components/FormHelpText.vue")).default;
    });

    scopedIt("renders sanitized help from prop", () => {
        const wrapper = mount(FormHelpText, { props: { help: "help" } });
        expect(sanitizeMessage).toHaveBeenCalledWith("help");
        expect(wrapper.find('[data-qa="feedback-alert"]').text()).toContain("help");
    });

    scopedIt("uses field context when help prop empty", () => {
        const fieldCtx = { state: { help: "context" } };
        const wrapper = mount(FormHelpText, {
            global: { provide: { [FieldContextSymbol]: fieldCtx } },
        });
        expect(sanitizeMessage).toHaveBeenCalledWith("context");
        expect(wrapper.find('[data-qa="feedback-alert"]').text()).toContain("context");
    });

    scopedIt("renders html when allowed", () => {
        sanitizeMessage.mockReturnValue("<b>bold</b>");
        containsHtml.mockReturnValue(true);
        const wrapper = mount(FormHelpText, { props: { help: "<b>bold</b>" } });
        const htmlDiv = wrapper.find('[data-qa="feedback-alert"] [data-qa="feedback-alert-description"] div');
        expect(htmlDiv.exists()).toBe(true);
        expect(htmlDiv.html()).toContain("<b>bold</b>");
    });

    scopedIt("displays plain text when html not allowed", () => {
        sanitizeMessage.mockReturnValue("<b>bold</b>");
        containsHtml.mockReturnValue(true);
        const wrapper = mount(FormHelpText, { props: { help: "<b>bold</b>", allowHtml: false } });
        expect(wrapper.find('[data-qa="feedback-alert"] [data-qa="feedback-alert-description"] div').exists()).toBe(
            false,
        );
        expect(wrapper.find('[data-qa="feedback-alert"]').text()).toContain("<b>bold</b>");
    });

    scopedIt("omits message when help empty", () => {
        sanitizeMessage.mockReturnValue("");
        const wrapper = mount(FormHelpText);
        expect(wrapper.find('[data-qa="feedback-alert"]').exists()).toBe(false);
    });

    scopedIt("applies theme class to root", () => {
        const wrapper = mount(FormHelpText, { props: { help: "hi" } });
        expect(useTheme).toHaveBeenCalled();
        expect(wrapper.classes()).toContain("root-class");
    });
});
