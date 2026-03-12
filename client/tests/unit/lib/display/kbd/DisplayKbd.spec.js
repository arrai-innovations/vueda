import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import DisplayKbd from "@vueda/display/kbd/DisplayKbd.vue";
import DisplayKbdGroup from "@vueda/display/kbd/DisplayKbdGroup.vue";

describe("lib/display/kbd/DisplayKbd.vue", () => {
    describe("DisplayKbd", () => {
        scopedIt("renders as a <kbd> element", () => {
            const wrapper = mount(DisplayKbd);
            expect(wrapper.element.tagName).toBe("KBD");
        });

        scopedIt("applies base classes", () => {
            const wrapper = mount(DisplayKbd);
            expect(wrapper.classes()).toContain("rounded-sm");
            expect(wrapper.classes()).toContain("font-medium");
            expect(wrapper.classes()).toContain("text-xs");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(DisplayKbd, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("rounded-sm");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(DisplayKbd, { slots: { default: "Ctrl" } });
            expect(wrapper.text()).toBe("Ctrl");
        });
    });

    describe("DisplayKbdGroup", () => {
        scopedIt("renders as a <kbd> element", () => {
            const wrapper = mount(DisplayKbdGroup);
            expect(wrapper.element.tagName).toBe("KBD");
        });

        scopedIt("always has data-slot=kbd-group", () => {
            const wrapper = mount(DisplayKbdGroup);
            expect(wrapper.attributes("data-slot")).toBe("kbd-group");
        });

        scopedIt("applies base classes", () => {
            const wrapper = mount(DisplayKbdGroup);
            expect(wrapper.classes()).toContain("inline-flex");
            expect(wrapper.classes()).toContain("items-center");
            expect(wrapper.classes()).toContain("gap-1");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(DisplayKbdGroup, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("inline-flex");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(DisplayKbdGroup, { slots: { default: "Ctrl+K" } });
            expect(wrapper.text()).toBe("Ctrl+K");
        });
    });
});
