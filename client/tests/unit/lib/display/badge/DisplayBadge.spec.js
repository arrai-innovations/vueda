import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import DisplayBadge from "@vueda/display/badge/DisplayBadge.vue";

describe("lib/display/badge/DisplayBadge.vue", () => {
    describe("rendering", () => {
        scopedIt("always has data-slot=badge", () => {
            const wrapper = mount(DisplayBadge);
            expect(wrapper.attributes("data-slot")).toBe("badge");
        });

        scopedIt("applies default variant classes", () => {
            const wrapper = mount(DisplayBadge);
            expect(wrapper.classes()).toContain("bg-primary");
            expect(wrapper.classes()).toContain("text-primary-foreground");
        });

        scopedIt("applies secondary variant classes", () => {
            const wrapper = mount(DisplayBadge, { props: { variant: "secondary" } });
            expect(wrapper.classes()).toContain("bg-secondary");
        });

        scopedIt("applies destructive variant classes", () => {
            const wrapper = mount(DisplayBadge, { props: { variant: "destructive" } });
            expect(wrapper.classes()).toContain("bg-destructive");
        });

        scopedIt("applies outline variant classes", () => {
            const wrapper = mount(DisplayBadge, { props: { variant: "outline" } });
            expect(wrapper.classes()).toContain("text-foreground");
        });

        scopedIt("merges custom class while preserving variant classes", () => {
            const wrapper = mount(DisplayBadge, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("bg-primary");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(DisplayBadge, { slots: { default: "New" } });
            expect(wrapper.text()).toBe("New");
        });
    });
});
