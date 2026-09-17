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
            messages: {},
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
    FormField = (await import("@vueda/form/form-model/FormField.vue")).default;
});

afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
});

describe("lib/form/form-model/FormField.vue", () => {
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

    describe("hidden=false (default, renders layout)", () => {
        scopedIt("renders Field layout with label", () => {
            fieldContext.state.label = "Email";
            const wrapper = mount(FormField, {
                props: { name: "test" },
                global: { stubs: { Field: false, FieldLabel: false, FieldContent: false } },
            });
            expect(wrapper.find("[data-slot='field']").exists()).toBe(true);
            expect(wrapper.find("[data-slot='field-label']").exists()).toBe(true);
            expect(wrapper.text()).toContain("Email");
        });

        scopedIt("renders required indicator when field is required", () => {
            fieldContext.state.required = true;
            fieldContext.state.label = "Name";
            const wrapper = mount(FormField, {
                props: { name: "test" },
            });
            expect(wrapper.find("span[aria-hidden='true']").text()).toBe("*");
        });

        scopedIt("does not render required indicator when field is not required", () => {
            fieldContext.state.required = false;
            const wrapper = mount(FormField, {
                props: { name: "test" },
            });
            expect(wrapper.find("span[aria-hidden='true']").exists()).toBe(false);
        });

        scopedIt("renders description when help text is present", () => {
            fieldContext.state.help = "Enter your email address";
            const wrapper = mount(FormField, {
                props: { name: "test" },
            });
            expect(wrapper.find("[data-slot='field-description']").text()).toBe("Enter your email address");
        });

        scopedIt("does not render description when help is empty", () => {
            fieldContext.state.help = "";
            const wrapper = mount(FormField, {
                props: { name: "test" },
            });
            expect(wrapper.find("[data-slot='field-description']").exists()).toBe(false);
        });

        scopedIt("renders errors from field context", async () => {
            fieldContext.state.errors = { required: "This field is required." };
            const wrapper = mount(FormField, {
                props: { name: "test" },
            });
            expect(wrapper.find("[data-slot='field-message']").text()).toBe("This field is required.");
        });

        scopedIt("does not render error element when no errors", () => {
            fieldContext.state.errors = {};
            const wrapper = mount(FormField, {
                props: { name: "test" },
            });
            expect(wrapper.find("[data-slot='field-message']").exists()).toBe(false);
        });

        scopedIt("applies orientation to Field", () => {
            const wrapper = mount(FormField, {
                props: { name: "test", orientation: "horizontal" },
            });
            expect(wrapper.find("[data-slot='field']").attributes("data-orientation")).toBe("horizontal");
        });

        scopedIt("applies class from attrs to Field", () => {
            const wrapper = mount(FormField, {
                props: { name: "test" },
                attrs: { class: "custom-class" },
            });
            expect(wrapper.find("[data-qa='form-field']").classes()).toContain("custom-class");
        });
    });

    describe("hideLabel=true (retains field feedback)", () => {
        scopedIt("keeps help, errors, and warnings below the control and updates them reactively", async () => {
            fieldContext.state.help = "Enter the ordered quantity.";
            fieldContext.state.errors = { required: "This field is required." };
            fieldContext.state.messages = { stock: "Quantity exceeds available stock." };
            const wrapper = mount(FormField, {
                props: { name: "quantity", hideLabel: true },
                slots: { default: '<input data-qa="quantity-control" />' },
            });

            expect(wrapper.find("[data-slot='field-label']").exists()).toBe(false);
            expect(wrapper.get("[data-qa='quantity-control']").exists()).toBe(true);
            expect(wrapper.get("[data-slot='field-description']").text()).toBe("Enter the ordered quantity.");
            expect(wrapper.get('[role="alert"]').text()).toBe("This field is required.");
            expect(wrapper.get('[role="status"]').text()).toBe("Quantity exceeds available stock.");

            fieldContext.state.errors = {};
            fieldContext.state.messages = {};
            await vue.nextTick();
            expect(wrapper.find("[data-slot='field-message']").exists()).toBe(false);
            expect(wrapper.get("[data-qa='quantity-control']").exists()).toBe(true);
        });

        scopedIt("retains error and warning slot overrides without rendering the label slot", () => {
            fieldContext.state.name = "quantity";
            fieldContext.state.errors = { required: "Required" };
            fieldContext.state.messages = { stock: "Check stock" };
            const wrapper = mount(FormField, {
                props: { name: "quantity", hideLabel: true },
                slots: {
                    "field-label": () => "Duplicate label",
                    "field(quantity)errors": ({ errors }) => `Error: ${errors.required}`,
                    "field-warnings": ({ messages }) => `Warning: ${messages.stock}`,
                },
            });
            expect(wrapper.text()).not.toContain("Duplicate label");
            expect(wrapper.text()).toContain("Error: Required");
            expect(wrapper.text()).toContain("Warning: Check stock");
        });
    });

    describe("hidden=true (suppresses layout)", () => {
        scopedIt("renders a plain div wrapper", () => {
            const wrapper = mount(FormField, { props: { name: "test", hidden: true } });
            const root = wrapper.find("[data-qa='form-field']");
            expect(root.exists()).toBe(true);
            expect(root.element.tagName).toBe("DIV");
        });

        scopedIt("does not render Field layout components", () => {
            fieldContext.state.label = "Test Label";
            fieldContext.state.help = "Some help";
            fieldContext.state.errors = { required: "Required" };
            const wrapper = mount(FormField, { props: { name: "test", hidden: true } });
            expect(wrapper.find("[data-slot='field']").exists()).toBe(false);
            expect(wrapper.find("[data-slot='field-label']").exists()).toBe(false);
            expect(wrapper.find("[data-slot='field-description']").exists()).toBe(false);
            expect(wrapper.find("[data-slot='field-message']").exists()).toBe(false);
        });

        scopedIt("applies class from attrs to the wrapper div", () => {
            const wrapper = mount(FormField, {
                props: { name: "test", hidden: true },
                attrs: { class: "custom-class" },
            });
            expect(wrapper.find("[data-qa='form-field']").classes()).toContain("custom-class");
        });
    });

    describe("override slots", () => {
        scopedIt("renders field-specific label slot when provided", () => {
            fieldContext.state.label = "Original";
            fieldContext.state.name = "email";
            const wrapper = mount(FormField, {
                props: { name: "email" },
                slots: {
                    "field(email)label": ({ label }) => `Custom: ${label}`,
                },
            });
            expect(wrapper.find("[data-slot='field-label']").text()).toBe("Custom: Original");
        });

        scopedIt("renders global field-label slot as fallback", () => {
            fieldContext.state.label = "Original";
            fieldContext.state.name = "email";
            const wrapper = mount(FormField, {
                props: { name: "email" },
                slots: {
                    "field-label": ({ label }) => `Global: ${label}`,
                },
            });
            expect(wrapper.find("[data-slot='field-label']").text()).toBe("Global: Original");
        });

        scopedIt("prefers field-specific label slot over global fallback", () => {
            fieldContext.state.label = "Original";
            fieldContext.state.name = "email";
            const wrapper = mount(FormField, {
                props: { name: "email" },
                slots: {
                    "field(email)label": () => "Specific",
                    "field-label": () => "Global",
                },
            });
            expect(wrapper.find("[data-slot='field-label']").text()).toBe("Specific");
        });

        scopedIt("label slot receives required prop", () => {
            fieldContext.state.required = true;
            fieldContext.state.name = "email";
            let receivedProps;
            mount(FormField, {
                props: { name: "email" },
                slots: {
                    "field(email)label": (props) => {
                        receivedProps = props;
                        return "";
                    },
                },
            });
            expect(receivedProps.required).toBe(true);
        });

        scopedIt("renders field-specific help slot when provided", () => {
            fieldContext.state.help = "Original help";
            fieldContext.state.name = "email";
            const wrapper = mount(FormField, {
                props: { name: "email" },
                slots: {
                    "field(email)help": ({ help }) => `Custom: ${help}`,
                },
            });
            expect(wrapper.text()).toContain("Custom: Original help");
        });

        scopedIt("renders global field-help slot as fallback", () => {
            fieldContext.state.help = "Original help";
            fieldContext.state.name = "email";
            const wrapper = mount(FormField, {
                props: { name: "email" },
                slots: {
                    "field-help": ({ help }) => `Global: ${help}`,
                },
            });
            expect(wrapper.text()).toContain("Global: Original help");
        });

        scopedIt("renders help slot even when help text is empty if slot is provided", () => {
            fieldContext.state.help = "";
            fieldContext.state.name = "email";
            const wrapper = mount(FormField, {
                props: { name: "email" },
                slots: {
                    "field(email)help": () => "Injected help",
                },
            });
            expect(wrapper.text()).toContain("Injected help");
        });

        scopedIt("renders field-specific errors slot when provided", () => {
            fieldContext.state.errors = { required: "Required" };
            fieldContext.state.name = "email";
            const wrapper = mount(FormField, {
                props: { name: "email" },
                slots: {
                    "field(email)errors": ({ errors }) => `Errors: ${Object.values(errors).join(", ")}`,
                },
            });
            expect(wrapper.text()).toContain("Errors: Required");
        });

        scopedIt("renders global field-errors slot as fallback", () => {
            fieldContext.state.errors = { required: "Required" };
            fieldContext.state.name = "email";
            const wrapper = mount(FormField, {
                props: { name: "email" },
                slots: {
                    "field-errors": ({ errors }) => `Global: ${Object.values(errors).join(", ")}`,
                },
            });
            expect(wrapper.text()).toContain("Global: Required");
        });

        scopedIt("renders field-specific warnings slot when provided", () => {
            fieldContext.state.messages = { weak: "Password is weak" };
            fieldContext.state.name = "email";
            const wrapper = mount(FormField, {
                props: { name: "email" },
                slots: {
                    "field(email)warnings": ({ messages }) => `Warn: ${Object.values(messages).join(", ")}`,
                },
            });
            expect(wrapper.text()).toContain("Warn: Password is weak");
        });

        scopedIt("renders global field-warnings slot as fallback", () => {
            fieldContext.state.messages = { weak: "Password is weak" };
            fieldContext.state.name = "email";
            const wrapper = mount(FormField, {
                props: { name: "email" },
                slots: {
                    "field-warnings": ({ messages }) => `Global: ${Object.values(messages).join(", ")}`,
                },
            });
            expect(wrapper.text()).toContain("Global: Password is weak");
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
            expect(receivedProps.fieldProps).toHaveProperty("hidden", false);
        });

        scopedIt("provides same slot props in hidden mode", () => {
            let receivedProps;
            mount(FormField, {
                props: { name: "test", hidden: true },
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
