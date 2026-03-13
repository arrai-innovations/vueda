import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ControlInput from "@vueda/controls/input/ControlInput.vue";

describe("lib/controls/input/ControlInput.vue", () => {
    describe("rendering", () => {
        scopedIt("renders a native input element", () => {
            const wrapper = mount(ControlInput);
            expect(wrapper.element.tagName).toBe("INPUT");
        });

        scopedIt("always has data-slot=input", () => {
            const wrapper = mount(ControlInput);
            expect(wrapper.attributes("data-slot")).toBe("input");
        });

        scopedIt("applies base styling classes", () => {
            const wrapper = mount(ControlInput);
            expect(wrapper.classes()).toContain("border-input");
            expect(wrapper.classes()).toContain("rounded-md");
            expect(wrapper.classes()).toContain("h-9");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(ControlInput, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("border-input");
        });

        scopedIt("passes through attributes to the input", () => {
            const wrapper = mount(ControlInput, { attrs: { placeholder: "Enter value", type: "email" } });
            expect(wrapper.attributes("placeholder")).toBe("Enter value");
            expect(wrapper.attributes("type")).toBe("email");
        });
    });

    describe("v-model", () => {
        scopedIt("reflects modelValue as the input value", async () => {
            const wrapper = mount(ControlInput, { props: { modelValue: "hello" } });
            expect(wrapper.element.value).toBe("hello");
        });

        scopedIt("emits update:modelValue on input", async () => {
            const wrapper = mount(ControlInput);
            await wrapper.setValue("typed");
            expect(wrapper.emitted("update:modelValue")).toBeTruthy();
            expect(wrapper.emitted("update:modelValue")[0][0]).toBe("typed");
        });

        scopedIt("uses defaultValue when modelValue is not provided", () => {
            const wrapper = mount(ControlInput, { props: { defaultValue: "default" } });
            expect(wrapper.element.value).toBe("default");
        });
    });
});
