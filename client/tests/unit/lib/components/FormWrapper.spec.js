import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

const useForm = vi.fn();
vi.mock("@vueda/use/useForm.js", () => ({
    default: useForm,
}));

describe("lib/components/FormWrapper.vue", () => {
    it("emits submit event with form data on form submission", async () => {
        const mockForm = { mockKey: "mockValue" };
        useForm.mockImplementation(() => mockForm);
        const FormWrapperModule = await import("@vueda/components/FormWrapper.vue");
        const FormWrapper = FormWrapperModule.default;
        const user = userEvent.setup();
        const wrapper = render(FormWrapper, {
            props: { initialValues: {} },
            slots: {
                default: "<button type='submit'>Submit</button>",
            },
        });
        const submit = wrapper.getByRole("button", { name: "Submit" });
        await user.click(submit);
        expect(wrapper.emitted("submit")).toBeTruthy();
        expect(wrapper.emitted("submit")[0][0]).toEqual(mockForm);
    });
    it("exposes the form as well", async () => {
        const mockForm = { mockKey: "mockValue" };
        useForm.mockImplementation(() => mockForm);
        const FormWrapperModule = await import("@vueda/components/FormWrapper.vue");
        const FormWrapper = FormWrapperModule.default;
        const wrapper = mount(FormWrapper, {
            propsData: { initialValues: {} },
            slots: {
                default: "<button type='submit'>Submit</button>",
            },
        });
        expect(wrapper.vm.form).toEqual(mockForm);
    });
});
