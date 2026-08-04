import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

const changePasswordMock = vi.fn();

const AuthFormStub = defineComponent({
    name: "AuthFormStub",
    props: ["runAction", "formProps"],
    emits: ["form-object"],
    setup(props, { slots, emit }) {
        emit("form-object", {});
        return () =>
            h("div", [
                slots["action-form-inner"] ? slots["action-form-inner"]({}) : null,
                slots.footer ? slots.footer({ fromAuthForm: true }) : null,
            ]);
    },
});

const FormFieldStub = defineComponent({
    name: "FormFieldStub",
    props: ["label", "name", "hidden", "validation"],
    setup(props, { slots }) {
        return () => h("div", null, slots.default ? slots.default() : null);
    },
});

const WidgetTextInputStub = defineComponent({
    name: "WidgetTextInputStub",
    setup(_, { slots }) {
        return () => h("div", null, slots.default ? slots.default({}) : null);
    },
});

vi.mock("@vueda/views/AuthForm.vue", () => ({ default: AuthFormStub }));
vi.mock("@vueda/form/form-model/FormField.vue", () => ({ default: FormFieldStub }));
vi.mock("@vueda/widgets/WidgetTextInput.vue", () => ({ default: WidgetTextInputStub }));
vi.mock("@vueda/stores/storeUser.js", () => ({ storeUser: () => ({ changePassword: changePasswordMock }) }));

let ViewChangePassword;

describe("lib/views/ViewChangePassword.vue", () => {
    beforeEach(async () => {
        changePasswordMock.mockReset();
        ViewChangePassword = (await import("@vueda/views/ViewChangePassword.vue")).default;
    });

    describe("Field and widget slots", () => {
        scopedIt("provides field and widget slots with their slot props", () => {
            const fieldSlotProps = {};
            mount(ViewChangePassword, {
                slots: {
                    "field(old_password)": (slotProps) => {
                        fieldSlotProps.old_password = slotProps;
                        return h("div");
                    },
                    "field(new_password1)": (slotProps) => {
                        fieldSlotProps.new_password1 = slotProps;
                        return h("div");
                    },
                    "field(new_password2)": (slotProps) => {
                        fieldSlotProps.new_password2 = slotProps;
                        return h("div");
                    },
                },
            });

            expect(fieldSlotProps.old_password).toMatchObject({ label: "Current Password" });
            expect(fieldSlotProps.new_password1).toMatchObject({ label: "New Password" });
            expect(fieldSlotProps.new_password2).toMatchObject({ label: "Confirm New Password" });

            const widgetSlotProps = {};
            const wrapper = mount(ViewChangePassword, {
                slots: {
                    "widget(old_password)": (slotProps) => {
                        widgetSlotProps.old_password = slotProps;
                        return h("div");
                    },
                    "widget(new_password1)": (slotProps) => {
                        widgetSlotProps.new_password1 = slotProps;
                        return h("div");
                    },
                    "widget(new_password2)": (slotProps) => {
                        widgetSlotProps.new_password2 = slotProps;
                        return h("div");
                    },
                },
            });

            expect(widgetSlotProps.old_password).toMatchObject({
                required: true,
                type: "password",
                autocomplete: "current-password",
            });
            expect(widgetSlotProps.new_password1).toMatchObject({
                required: true,
                type: "password",
            });
            expect(widgetSlotProps.new_password2).toMatchObject({
                required: true,
                type: "password",
            });

            expect(wrapper.findComponent(AuthFormStub).exists()).toBe(true);
        });
    });

    describe("Submission", () => {
        scopedIt("calls changePassword with form values when submitted", async () => {
            changePasswordMock.mockResolvedValue({ ok: true });
            const wrapper = mount(ViewChangePassword);
            const runAction = wrapper.findComponent(AuthFormStub).props("runAction");

            await expect(
                runAction({ formValues: { old_password: "current", new_password1: "new", new_password2: "confirm" } }),
            ).resolves.toEqual({ ok: true });

            expect(changePasswordMock).toHaveBeenCalledWith({
                old_password: "current",
                new_password1: "new",
                new_password2: "confirm",
            });
        });
    });
});
