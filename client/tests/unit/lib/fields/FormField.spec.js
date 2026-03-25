import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

let FormField, vue, useFieldMock, useFieldValidationMock, fieldContext;

beforeEach(async () => {
    vi.resetModules();
    vue = await import("vue");
    fieldContext = {
        state: vue.reactive({
            fieldId: "test-field-id",
            value: null,
            label: "My Label",
            help: "",
            errors: {},
            required: false,
        }),
        updateError: vi.fn(),
        deleteError: vi.fn(),
    };
    useFieldMock = vi.fn(() => fieldContext);
    useFieldValidationMock = vi.fn();
    vi.doMock("@vueda/use/useField.js", () => ({
        FIELD_PROPS: {},
        FIELD_EMITS: [],
        useField: useFieldMock,
    }));
    vi.doMock("@vueda/use/validation/useFieldValidation.js", () => ({
        useFieldValidation: useFieldValidationMock,
    }));
    FormField = (await import("@vueda/fields/FormField.vue")).default;
});

afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
});

describe("lib/fields/FormField.vue", () => {
    describe("context and validation wiring", () => {
        scopedIt("calls useField with props and emit", () => {
            mount(FormField, { props: { name: "test" } });
            expect(useFieldMock).toHaveBeenCalledTimes(1);
        });

        scopedIt("dispatches validation type to useFieldValidation", () => {
            mount(FormField, { props: { name: "test", validation: "text" } });
            expect(useFieldValidationMock).toHaveBeenCalledWith("text", fieldContext, expect.any(Object));
        });

        scopedIt("calls useFieldValidation with undefined when no validation prop", () => {
            mount(FormField, { props: { name: "test" } });
            expect(useFieldValidationMock).toHaveBeenCalledWith(undefined, fieldContext, expect.any(Object));
        });
    });

    describe("ownsLayout=false (default)", () => {
        scopedIt("renders a plain div wrapper", () => {
            const wrapper = mount(FormField, { props: { name: "test" } });
            const root = wrapper.find("[data-qa='form-field']");
            expect(root.exists()).toBe(true);
            expect(root.element.tagName).toBe("DIV");
        });

        scopedIt("does not render ShellField layout components", () => {
            fieldContext.state.label = "Test Label";
            fieldContext.state.help = "Some help";
            fieldContext.state.errors = { required: "Required" };
            const wrapper = mount(FormField, { props: { name: "test" } });
            expect(wrapper.find("[data-slot='field']").exists()).toBe(false);
            expect(wrapper.find("[data-slot='field-label']").exists()).toBe(false);
            expect(wrapper.find("[data-slot='field-description']").exists()).toBe(false);
            expect(wrapper.find("[data-slot='field-error']").exists()).toBe(false);
        });

        scopedIt("applies class from attrs to the wrapper div", () => {
            const wrapper = mount(FormField, {
                props: { name: "test" },
                attrs: { class: "custom-class" },
            });
            expect(wrapper.find("[data-qa='form-field']").classes()).toContain("custom-class");
        });
    });

    describe("ownsLayout=true", () => {
        scopedIt("renders ShellField layout with label", () => {
            fieldContext.state.label = "Email";
            const wrapper = mount(FormField, {
                props: { name: "test", ownsLayout: true },
                global: { stubs: { ShellField: false, ShellFieldLabel: false, ShellFieldContent: false } },
            });
            expect(wrapper.find("[data-slot='field']").exists()).toBe(true);
            expect(wrapper.find("[data-slot='field-label']").exists()).toBe(true);
            expect(wrapper.text()).toContain("Email");
        });

        scopedIt("renders required indicator when field is required", () => {
            fieldContext.state.required = true;
            fieldContext.state.label = "Name";
            const wrapper = mount(FormField, {
                props: { name: "test", ownsLayout: true },
            });
            expect(wrapper.find("span[aria-hidden='true']").text()).toBe("*");
        });

        scopedIt("does not render required indicator when field is not required", () => {
            fieldContext.state.required = false;
            const wrapper = mount(FormField, {
                props: { name: "test", ownsLayout: true },
            });
            expect(wrapper.find("span[aria-hidden='true']").exists()).toBe(false);
        });

        scopedIt("renders description when help text is present", () => {
            fieldContext.state.help = "Enter your email address";
            const wrapper = mount(FormField, {
                props: { name: "test", ownsLayout: true },
            });
            expect(wrapper.find("[data-slot='field-description']").text()).toBe("Enter your email address");
        });

        scopedIt("does not render description when help is empty", () => {
            fieldContext.state.help = "";
            const wrapper = mount(FormField, {
                props: { name: "test", ownsLayout: true },
            });
            expect(wrapper.find("[data-slot='field-description']").exists()).toBe(false);
        });

        scopedIt("renders errors from field context", async () => {
            fieldContext.state.errors = { required: "This field is required." };
            const wrapper = mount(FormField, {
                props: { name: "test", ownsLayout: true },
            });
            expect(wrapper.find("[data-slot='field-error']").text()).toBe("This field is required.");
        });

        scopedIt("does not render error element when no errors", () => {
            fieldContext.state.errors = {};
            const wrapper = mount(FormField, {
                props: { name: "test", ownsLayout: true },
            });
            expect(wrapper.find("[data-slot='field-error']").exists()).toBe(false);
        });

        scopedIt("applies orientation to ShellField", () => {
            const wrapper = mount(FormField, {
                props: { name: "test", ownsLayout: true, orientation: "horizontal" },
            });
            expect(wrapper.find("[data-slot='field']").attributes("data-orientation")).toBe("horizontal");
        });
    });

    describe("slot props", () => {
        scopedIt("provides field-id as a slot prop", () => {
            let receivedProps;
            mount(FormField, {
                props: { name: "test" },
                slots: {
                    default: (slotProps) => {
                        receivedProps = slotProps;
                        return "";
                    },
                },
            });
            expect(receivedProps.fieldId).toBeDefined();
            expect(typeof receivedProps.fieldId).toBe("string");
        });

        scopedIt("provides field-attrs excluding class", () => {
            let receivedProps;
            mount(FormField, {
                props: { name: "test" },
                attrs: { class: "my-class", "data-custom": "value" },
                slots: {
                    default: (slotProps) => {
                        receivedProps = slotProps;
                        return "";
                    },
                },
            });
            expect(receivedProps.fieldAttrs).not.toHaveProperty("class");
            expect(receivedProps.fieldAttrs).toHaveProperty("data-custom", "value");
        });

        scopedIt("provides field-props containing declared props", () => {
            let receivedProps;
            mount(FormField, {
                props: { name: "test", validation: "text" },
                slots: {
                    default: (slotProps) => {
                        receivedProps = slotProps;
                        return "";
                    },
                },
            });
            expect(receivedProps.fieldProps).toHaveProperty("validation", "text");
            expect(receivedProps.fieldProps).toHaveProperty("ownsLayout", false);
        });

        scopedIt("provides same slot props in ownsLayout mode", () => {
            let receivedProps;
            mount(FormField, {
                props: { name: "test", ownsLayout: true },
                slots: {
                    default: (slotProps) => {
                        receivedProps = slotProps;
                        return "";
                    },
                },
            });
            expect(receivedProps.fieldId).toBeDefined();
            expect(receivedProps.fieldAttrs).toBeDefined();
            expect(receivedProps.fieldProps).toBeDefined();
        });
    });
});
