import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Badge from "@vueda/display/badge/Badge.vue";

describe("lib/display/badge/Badge.vue", () => {
    describe("rendering", () => {
        scopedIt("always has data-slot=badge", () => {
            const wrapper = mount(Badge);
            expect(wrapper.attributes("data-slot")).toBe("badge");
        });

        scopedIt("applies default variant classes", () => {
            const wrapper = mount(Badge);
            expect(wrapper.classes()).toContain("bg-primary");
            expect(wrapper.classes()).toContain("text-primary-foreground");
        });

        scopedIt("applies secondary variant classes", () => {
            const wrapper = mount(Badge, { props: { variant: "secondary" } });
            expect(wrapper.classes()).toContain("bg-secondary");
        });

        scopedIt("applies destructive variant classes", () => {
            const wrapper = mount(Badge, { props: { variant: "destructive" } });
            expect(wrapper.classes()).toContain("bg-destructive");
        });

        scopedIt("applies outline variant classes", () => {
            const wrapper = mount(Badge, { props: { variant: "outline" } });
            expect(wrapper.classes()).toContain("text-foreground");
        });

        scopedIt("merges custom class while preserving variant classes", () => {
            const wrapper = mount(Badge, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("bg-primary");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(Badge, { slots: { default: "New" } });
            expect(wrapper.text()).toBe("New");
        });
    });
});
