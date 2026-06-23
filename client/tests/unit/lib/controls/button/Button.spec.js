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

        scopedIt("a bare button resolves to the neutral fill (secondary) resting default", () => {
            const wrapper = mount(Button);
            expect(wrapper.classes()).toContain("bg-secondary");
            expect(wrapper.classes()).not.toContain("bg-primary");
            expect(wrapper.classes()).toContain("h-vueda-control");
            expect(wrapper.attributes("data-tone")).toBe("neutral");
            expect(wrapper.attributes("data-emphasis")).toBe("fill");
        });

        scopedIt("the primary fill is opt-in via variant=default", () => {
            const wrapper = mount(Button, { props: { variant: "default" } });
            expect(wrapper.classes()).toContain("bg-primary");
        });

        scopedIt("applies variant-specific classes", () => {
            const wrapper = mount(Button, { props: { variant: "destructive" } });
            expect(wrapper.classes()).toContain("bg-destructive");
        });

        scopedIt("applies size-specific classes", () => {
            const wrapper = mount(Button, { props: { size: "lg" } });
            expect(wrapper.classes()).toContain("h-vueda-control-lg");
        });

        scopedIt("link variant uses inline-flow sizing (h-auto, px-0) instead of control sizing", () => {
            const wrapper = mount(Button, { props: { variant: "link" } });
            expect(wrapper.classes()).toContain("h-auto");
            expect(wrapper.classes()).toContain("px-0");
            expect(wrapper.classes()).not.toContain("h-vueda-control");
            expect(wrapper.classes()).not.toContain("px-vueda-control-px");
        });

        scopedIt("link variant ignores size prop for height/padding", () => {
            const wrapper = mount(Button, { props: { variant: "link", size: "lg" } });
            expect(wrapper.classes()).toContain("h-auto");
            expect(wrapper.classes()).not.toContain("h-vueda-control-lg");
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
            expect(wrapper.classes()).toContain("bg-secondary");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(Button, { slots: { default: "Click me" } });
            expect(wrapper.text()).toBe("Click me");
        });

        scopedIt("resolves explicit tone + emphasis to the matching primitive classes", () => {
            const wrapper = mount(Button, { props: { tone: "destructive", emphasis: "outline" } });
            expect(wrapper.classes()).toContain("border-destructive");
            expect(wrapper.classes()).toContain("text-destructive");
            expect(wrapper.classes()).not.toContain("bg-destructive");
        });

        scopedIt("neutral link is foreground-toned, not primary-toned", () => {
            const wrapper = mount(Button, { props: { tone: "neutral", emphasis: "link" } });
            expect(wrapper.classes()).toContain("text-foreground");
            expect(wrapper.classes()).toContain("h-auto");
            expect(wrapper.classes()).not.toContain("text-primary");
        });

        scopedIt("explicit tone overrides the tone implied by variant", () => {
            const wrapper = mount(Button, { props: { variant: "link", tone: "destructive" } });
            expect(wrapper.classes()).toContain("text-destructive");
            expect(wrapper.classes()).toContain("h-auto");
        });

        scopedIt("reflects resolved tone and emphasis in data attributes", () => {
            const wrapper = mount(Button, { props: { variant: "outline" } });
            expect(wrapper.attributes("data-tone")).toBe("neutral");
            expect(wrapper.attributes("data-emphasis")).toBe("outline");
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
            expect(wrapper.classes()).toContain("bg-secondary");
        });
    });
});
