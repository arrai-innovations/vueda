import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Textarea from "@vueda/controls/textarea/Textarea.vue";

describe("lib/controls/textarea/Textarea.vue", () => {
    describe("rendering", () => {
        scopedIt("renders a native textarea element", () => {
            const wrapper = mount(Textarea);
            expect(wrapper.element.tagName).toBe("TEXTAREA");
        });

        scopedIt("always has data-slot=textarea", () => {
            const wrapper = mount(Textarea);
            expect(wrapper.attributes("data-slot")).toBe("textarea");
        });

        scopedIt("applies base styling classes", () => {
            const wrapper = mount(Textarea);
            expect(wrapper.classes()).toContain("border-input");
            expect(wrapper.classes()).toContain("rounded-vueda-control");
            expect(wrapper.classes()).toContain("min-h-16");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(Textarea, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("border-input");
        });

        scopedIt("passes through attributes to the textarea", () => {
            const wrapper = mount(Textarea, { attrs: { placeholder: "Enter text", rows: "4" } });
            expect(wrapper.attributes("placeholder")).toBe("Enter text");
            expect(wrapper.attributes("rows")).toBe("4");
        });
    });

    describe("v-model", () => {
        scopedIt("reflects modelValue as the textarea value", async () => {
            const wrapper = mount(Textarea, { props: { modelValue: "hello" } });
            expect(wrapper.element.value).toBe("hello");
        });

        scopedIt("emits update:modelValue on input", async () => {
            const wrapper = mount(Textarea);
            await wrapper.setValue("typed");
            expect(wrapper.emitted("update:modelValue")).toBeTruthy();
            expect(wrapper.emitted("update:modelValue")[0][0]).toBe("typed");
        });

        scopedIt("uses defaultValue when modelValue is not provided", () => {
            const wrapper = mount(Textarea, { props: { defaultValue: "default" } });
            expect(wrapper.element.value).toBe("default");
        });
    });
});
