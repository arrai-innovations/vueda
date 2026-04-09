import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { NON_FIELD_ERRORS_KEY } from "@vueda/utils/constants.js";
import { FieldContextSymbol, FormContextSymbol } from "@vueda/utils/symbols.js";
import { h } from "vue";

const DOMPurify = { sanitize: vi.fn((msg) => msg) };
vi.mock("dompurify", () => ({ __esModule: true, default: DOMPurify }));

const FeedbackAlertStub = {
    name: "FeedbackAlertStub",
    props: ["variant"],
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "feedback-alert" }, slots.default ? slots.default() : null);
    },
};
const FeedbackAlertDescriptionStub = {
    name: "FeedbackAlertDescriptionStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "feedback-alert-description" }, slots.default ? slots.default() : null);
    },
};
vi.mock("@vueda/feedback/alert", () => ({
    FeedbackAlert: FeedbackAlertStub,
    FeedbackAlertDescription: FeedbackAlertDescriptionStub,
}));

const mockedUseTheme = vi.fn(() => () => "theme");
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
}));

let FormFeedback, vue;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    FormFeedback = (await import("@vueda/components/FormFeedback.vue")).default;
    DOMPurify.sanitize.mockClear();
    mockedUseTheme.mockClear();
});

scopedIt("renders HTML messages from props when allowHtml", async () => {
    const wrapper = mount(FormFeedback, {
        props: {
            messages: { m: "<b>bad</b>" },
        },
    });
    await vue.nextTick();
    expect(DOMPurify.sanitize).toHaveBeenCalled();
    expect(wrapper.html()).toContain("<b>bad</b>");
});

scopedIt("renders text when allowHtml is false", async () => {
    const wrapper = mount(FormFeedback, {
        props: { messages: { m: "<b>bad</b>" }, allowHtml: false },
    });
    await vue.nextTick();
    const msg = wrapper.get("[data-qa='feedback-alert']");
    expect(msg.html()).toContain("&lt;b&gt;bad&lt;/b&gt;");
});

scopedIt("displays field context errors and updates reactively", async () => {
    const fieldContext = {
        state: vue.reactive({ errors: { code: "err" }, messages: {} }),
    };
    const wrapper = mount(FormFeedback, {
        global: { provide: { [FieldContextSymbol]: fieldContext } },
    });
    await vue.nextTick();
    expect(wrapper.text()).toContain("err");
    fieldContext.state.errors = {};
    await vue.nextTick();
    expect(wrapper.find("[data-qa='form-feedback-root']").exists()).toBe(false);
});

scopedIt("falls back to form non field errors", async () => {
    const formContext = {
        state: vue.reactive({
            errors: { [NON_FIELD_ERRORS_KEY]: { general: "boom" } },
            messages: {},
        }),
    };
    const wrapper = mount(FormFeedback, {
        global: { provide: { [FormContextSymbol]: formContext } },
    });
    await vue.nextTick();
    expect(wrapper.text()).toContain("boom");
});

scopedIt("throws a clear error when structured feedback is missing detail", () => {
    const fieldContext = {
        state: vue.reactive({
            errors: { code: { rows: ["1", "2"] } },
            messages: {},
        }),
    };
    expect(() =>
        mount(FormFeedback, {
            global: { provide: { [FieldContextSymbol]: fieldContext } },
        }),
    ).toThrow("Structured feedback object must include a string 'detail' template");
});
