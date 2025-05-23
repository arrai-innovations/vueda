import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { NON_FIELD_ERRORS_KEY } from "@vueda/utils/constants.js";
import { FieldContextSymbol, FormContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, nextTick, reactive } from "vue";

const FormHelpTextStub = defineComponent({
    name: "FormHelpTextStub",
    props: ["help"],
    setup(props) {
        return () => h("div", { "data-qa": "form-help-text", "data-help": props.help });
    },
});

const FormFeedbackStub = defineComponent({
    name: "FormFeedbackStub",
    props: ["type", "messages"],
    setup(props) {
        return () =>
            h("div", {
                "data-qa": `form-feedback-${props.type}`,
                "data-messages": JSON.stringify(props.messages),
            });
    },
});

vi.mock("@vueda/components/FormHelpText.vue", () => ({ default: FormHelpTextStub }));
vi.mock("@vueda/components/FormFeedback.vue", () => ({ default: FormFeedbackStub }));
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: () => (key) => `theme-${key}`, THEME_OVERRIDE_PROPS: {} }));

const FormChores = await import("@vueda/components/FormChores.vue").then((m) => m.default);

function mountWithContext(options = {}) {
    return mount(FormChores, options);
}

function getSlots(name) {
    return {
        [`feedback(${name})error`]: () => h("div"),
        [`feedback(${name})error-content`]: () => h("div"),
        [`feedback(${name})message`]: () => h("div"),
        [`feedback(${name})message-content`]: () => h("div"),
    };
}

describe("lib/components/FormChores.vue", () => {
    scopedIt("warns when used without context and missing props", async () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        mountWithContext();
        await nextTick();
        expect(warnSpy).toHaveBeenCalled();
    });

    scopedIt("renders help and feedback from context", async () => {
        const formContext = { state: reactive({ errors: { my: { err: "e" } }, messages: { my: { msg: "m" } } }) };
        const fieldContext = { state: reactive({ name: "my", help: "help" }) };
        const wrapper = mountWithContext({
            global: { provide: { [FormContextSymbol]: formContext, [FieldContextSymbol]: fieldContext } },
            slots: getSlots("my"),
        });
        await nextTick();
        expect(wrapper.find('[data-qa="form-help-text"]').attributes("data-help")).toBe("help");
        expect(wrapper.find('[data-qa="form-feedback-error"]').exists()).toBe(true);
        expect(wrapper.find('[data-qa="form-feedback-message"]').exists()).toBe(true);
    });

    scopedIt("uses prop name over field context name", async () => {
        const formContext = { state: reactive({ errors: { prop: { err: true } } }) };
        const fieldContext = { state: reactive({ name: "ctx" }) };
        const wrapper = mountWithContext({
            props: { name: "prop" },
            global: { provide: { [FormContextSymbol]: formContext, [FieldContextSymbol]: fieldContext } },
            slots: getSlots("prop"),
        });
        await nextTick();
        expect(wrapper.find('[data-qa="form-feedback-error"]').exists()).toBe(true);
    });

    scopedIt("falls back to NON_FIELD_ERRORS_KEY", async () => {
        const formContext = { state: reactive({ errors: { [NON_FIELD_ERRORS_KEY]: { err: true } } }) };
        const wrapper = mountWithContext({
            global: { provide: { [FormContextSymbol]: formContext } },
            slots: getSlots(NON_FIELD_ERRORS_KEY),
        });
        await nextTick();
        expect(wrapper.find('[data-qa="form-feedback-error"]').exists()).toBe(true);
    });
});
