import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Label from "@vueda/shell/label/Label.vue";

describe("lib/shell/label/Label.vue", () => {
    describe("rendering", () => {
        scopedIt("renders as a <label> element", () => {
            const wrapper = mount(Label);
            expect(wrapper.element.tagName).toBe("LABEL");
        });

        scopedIt("always has data-slot=label", () => {
            const wrapper = mount(Label);
            expect(wrapper.attributes("data-slot")).toBe("label");
        });

        scopedIt("applies base classes", () => {
            const wrapper = mount(Label);
            expect(wrapper.classes()).toContain("text-sm");
            expect(wrapper.classes()).toContain("font-medium");
            expect(wrapper.classes()).toContain("leading-none");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(Label, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("text-sm");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(Label, { slots: { default: "Email address" } });
            expect(wrapper.text()).toBe("Email address");
        });

        scopedIt("forwards the for prop as the htmlFor attribute", () => {
            const wrapper = mount(Label, { props: { for: "email-input" } });
            expect(wrapper.attributes("for")).toBe("email-input");
        });
    });
});
