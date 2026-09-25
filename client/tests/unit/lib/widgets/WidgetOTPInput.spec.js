import { scopedIt } from "@tests/unit/utils.js";
import { flushPromises, mount } from "@vue/test-utils";
import FormField from "@vueda/form/form-model/FormField.vue";
import { useForm } from "@vueda/use/useForm.js";
import WidgetOTPInput from "@vueda/widgets/WidgetOTPInput.vue";
import { defineComponent, h, reactive } from "vue";

const mounted = [];

function mountInForm(initialValues, widgetProps = {}) {
    let form;
    const wrapper = mount(
        defineComponent({
            setup() {
                form = useForm(reactive({ initialValues }));
                return () =>
                    h(FormField, { name: "code", label: "Code" }, () =>
                        h(WidgetOTPInput, { "data-qa": "caller-otp", ...widgetProps }),
                    );
            },
        }),
        { attachTo: document.body },
    );
    mounted.push(wrapper);
    return { wrapper, form: () => form };
}

describe("lib/widgets/WidgetOTPInput.vue", () => {
    beforeEach(() => {
        vi.stubGlobal(
            "ResizeObserver",
            class {
                observe() {}
                disconnect() {}
            },
        );
    });
    afterEach(() => {
        mounted.splice(0).forEach((wrapper) => wrapper.unmount());
        document.getElementById("input-otp-style")?.remove();
        vi.unstubAllGlobals();
    });

    describe("Form field integration", () => {
        scopedIt("writes the typed code to the field value", async () => {
            const { wrapper, form } = mountInForm({ code: "" });
            await flushPromises();

            await wrapper.get("input").setValue("123456");
            await flushPromises();

            expect(form().state.values.code).toBe("123456");
        });

        scopedIt("shows the field's initial value", async () => {
            const { wrapper } = mountInForm({ code: "4321" });
            await flushPromises();

            expect(wrapper.get("input").element.value).toBe("4321");
        });

        scopedIt("puts the field id and name on the input", async () => {
            const { wrapper } = mountInForm({ code: "" });
            await flushPromises();

            const input = wrapper.get("input");
            expect(input.attributes("name")).toBe("code");
            expect(input.attributes("id")).toBe(wrapper.get("label").attributes("for"));
        });
    });

    describe("Rendering", () => {
        scopedIt("renders one character slot per maxlength", async () => {
            const { wrapper } = mountInForm({ code: "" }, { maxlength: 4 });
            await flushPromises();

            expect(wrapper.findAll("[data-slot=input-otp-slot]")).toHaveLength(4);
        });

        scopedIt("keeps the caller's data-qa", async () => {
            const { wrapper } = mountInForm({ code: "" });
            await flushPromises();

            expect(wrapper.find("[data-qa=caller-otp]").exists()).toBe(true);
        });
    });
});
