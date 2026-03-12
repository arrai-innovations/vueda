import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ControlToggle from "@vueda/controls/toggle/ControlToggle.vue";
import { toggleVariants } from "@vueda/controls/toggle/index.js";

describe("lib/controls/toggle/ControlToggle.vue", () => {
    describe("toggleVariants", () => {
        it("applies default variant and size classes when called with no arguments", () => {
            const cls = toggleVariants({});
            expect(cls).toContain("bg-transparent");
            expect(cls).toContain("h-9");
        });

        it.each([
            ["default", "bg-transparent"],
            ["outline", "border-input"],
        ])("variant %s includes a distinguishing class", (variant, marker) => {
            expect(toggleVariants({ variant })).toContain(marker);
        });

        it.each([
            ["default", "h-9"],
            ["sm", "h-8"],
            ["lg", "h-10"],
        ])("size %s includes a distinguishing class", (size, marker) => {
            expect(toggleVariants({ size })).toContain(marker);
        });
    });

    describe("rendering", () => {
        scopedIt("always has data-slot=toggle", () => {
            const wrapper = mount(ControlToggle);
            expect(wrapper.attributes("data-slot")).toBe("toggle");
        });

        scopedIt("applies default variant classes", () => {
            const wrapper = mount(ControlToggle);
            expect(wrapper.classes()).toContain("bg-transparent");
            expect(wrapper.classes()).toContain("h-9");
        });

        scopedIt("applies outline variant classes", () => {
            const wrapper = mount(ControlToggle, { props: { variant: "outline" } });
            expect(wrapper.classes()).toContain("border-input");
        });

        scopedIt("applies sm size classes", () => {
            const wrapper = mount(ControlToggle, { props: { size: "sm" } });
            expect(wrapper.classes()).toContain("h-8");
        });

        scopedIt("applies lg size classes", () => {
            const wrapper = mount(ControlToggle, { props: { size: "lg" } });
            expect(wrapper.classes()).toContain("h-10");
        });

        scopedIt("merges custom class while preserving variant classes", () => {
            const wrapper = mount(ControlToggle, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("bg-transparent");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlToggle, { slots: { default: "Toggle me" } });
            expect(wrapper.text()).toBe("Toggle me");
        });
    });
});
