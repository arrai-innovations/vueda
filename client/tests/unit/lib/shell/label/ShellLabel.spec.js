import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ShellLabel from "@vueda/shell/label/ShellLabel.vue";

describe("lib/shell/label/ShellLabel.vue", () => {
    describe("rendering", () => {
        scopedIt("renders as a <label> element", () => {
            const wrapper = mount(ShellLabel);
            expect(wrapper.element.tagName).toBe("LABEL");
        });

        scopedIt("always has data-slot=label", () => {
            const wrapper = mount(ShellLabel);
            expect(wrapper.attributes("data-slot")).toBe("label");
        });

        scopedIt("applies base classes", () => {
            const wrapper = mount(ShellLabel);
            expect(wrapper.classes()).toContain("text-sm");
            expect(wrapper.classes()).toContain("font-medium");
            expect(wrapper.classes()).toContain("leading-none");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(ShellLabel, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("text-sm");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ShellLabel, { slots: { default: "Email address" } });
            expect(wrapper.text()).toBe("Email address");
        });

        scopedIt("forwards the for prop as the htmlFor attribute", () => {
            const wrapper = mount(ShellLabel, { props: { for: "email-input" } });
            expect(wrapper.attributes("for")).toBe("email-input");
        });
    });
});
