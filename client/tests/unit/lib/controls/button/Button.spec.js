import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Button from "@vueda/controls/button/Button.vue";
import { h } from "vue";

describe("lib/controls/button/Button.vue", () => {
    describe("rendering", () => {
        scopedIt("renders as a <button> by default", () => {
            const wrapper = mount(Button);
            expect(wrapper.element.tagName).toBe("BUTTON");
        });

        scopedIt("always has data-slot=button", () => {
            const wrapper = mount(Button);
            expect(wrapper.attributes("data-slot")).toBe("button");
        });

        scopedIt("applies default variant classes", () => {
            const wrapper = mount(Button);
            expect(wrapper.classes()).toContain("bg-primary");
            expect(wrapper.classes()).toContain("h-vueda-control");
        });

        scopedIt("applies variant-specific classes", () => {
            const wrapper = mount(Button, { props: { variant: "destructive" } });
            expect(wrapper.classes()).toContain("bg-destructive");
        });

        scopedIt("applies size-specific classes", () => {
            const wrapper = mount(Button, { props: { size: "lg" } });
            expect(wrapper.classes()).toContain("h-vueda-control-lg");
        });

        scopedIt("reflects variant prop in data-variant attribute", () => {
            const wrapper = mount(Button, { props: { variant: "destructive" } });
            expect(wrapper.attributes("data-variant")).toBe("destructive");
        });

        scopedIt("reflects size prop in data-size attribute", () => {
            const wrapper = mount(Button, { props: { size: "lg" } });
            expect(wrapper.attributes("data-size")).toBe("lg");
        });

        scopedIt("merges custom class while preserving variant classes", () => {
            const wrapper = mount(Button, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("bg-primary");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(Button, { slots: { default: "Click me" } });
            expect(wrapper.text()).toBe("Click me");
        });

        scopedIt("renders as a different element when as prop is set", () => {
            const wrapper = mount(Button, { props: { as: "a" } });
            expect(wrapper.element.tagName).toBe("A");
        });

        scopedIt("merges attributes onto child element when asChild is true", () => {
            const wrapper = mount(Button, {
                props: { asChild: true },
                slots: { default: () => h("a", { href: "/foo" }, "Link") },
            });
            expect(wrapper.element.tagName).toBe("A");
            expect(wrapper.attributes("data-slot")).toBe("button");
            expect(wrapper.classes()).toContain("bg-primary");
        });
    });
});
