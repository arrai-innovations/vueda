import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ControlToggle from "@vueda/controls/toggle/ControlToggle.vue";

describe("lib/controls/toggle/ControlToggle.vue", () => {
    describe("rendering", () => {
        scopedIt("always has data-slot=toggle", () => {
            const wrapper = mount(ControlToggle);
            expect(wrapper.attributes("data-slot")).toBe("toggle");
        });

        scopedIt("applies default variant and size classes", () => {
            const wrapper = mount(ControlToggle);
            expect(wrapper.classes()).toContain("inline-flex");
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

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(ControlToggle, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("inline-flex");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlToggle, { slots: { default: "Toggle me" } });
            expect(wrapper.text()).toBe("Toggle me");
        });
    });
});
