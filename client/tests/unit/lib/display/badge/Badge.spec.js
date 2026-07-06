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

        scopedIt("applies numeric recipe classes when numeric is true", () => {
            const wrapper = mount(Badge, { props: { numeric: true } });
            expect(wrapper.classes()).toContain("font-mono");
            expect(wrapper.classes()).toContain("tabular-nums");
            expect(wrapper.classes()).toContain("min-w-5");
            expect(wrapper.classes()).toContain("px-1");
            expect(wrapper.classes()).not.toContain("px-2");
        });

        scopedIt("uses default px-2 when numeric is false", () => {
            const wrapper = mount(Badge);
            expect(wrapper.classes()).toContain("px-2");
            expect(wrapper.classes()).not.toContain("font-mono");
            expect(wrapper.classes()).not.toContain("tabular-nums");
        });

        scopedIt("declares aria-invalid destructive ring on root", () => {
            const wrapper = mount(Badge);
            expect(wrapper.classes()).toContain("aria-invalid:hairline-destructive");
            expect(wrapper.classes()).toContain("aria-invalid:focus-ring-shadow-destructive");
        });
    });
});
