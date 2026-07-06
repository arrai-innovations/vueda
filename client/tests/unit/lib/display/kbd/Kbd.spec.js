import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Kbd from "@vueda/display/kbd/Kbd.vue";
import KbdGroup from "@vueda/display/kbd/KbdGroup.vue";

describe("lib/display/kbd/Kbd.vue", () => {
    describe("Kbd", () => {
        scopedIt("renders as a <kbd> element", () => {
            const wrapper = mount(Kbd);
            expect(wrapper.element.tagName).toBe("KBD");
        });

        scopedIt("applies base classes", () => {
            const wrapper = mount(Kbd);
            expect(wrapper.classes()).toContain("rounded-vueda-checkbox");
            expect(wrapper.classes()).toContain("border-hairline");
            expect(wrapper.classes()).toContain("font-mono");
            expect(wrapper.classes()).toContain("text-[length:var(--vueda-text-micro)]");
            expect(wrapper.classes()).toContain("font-semibold");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(Kbd, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("rounded-vueda-checkbox");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(Kbd, { slots: { default: "Ctrl" } });
            expect(wrapper.text()).toBe("Ctrl");
        });
    });

    describe("KbdGroup", () => {
        scopedIt("renders as a non-keycap grouping element", () => {
            const wrapper = mount(KbdGroup);
            expect(wrapper.element.tagName).toBe("SPAN");
        });

        scopedIt("always has data-slot=kbd-group", () => {
            const wrapper = mount(KbdGroup);
            expect(wrapper.attributes("data-slot")).toBe("kbd-group");
        });

        scopedIt("applies base classes", () => {
            const wrapper = mount(KbdGroup);
            expect(wrapper.classes()).toContain("inline-flex");
            expect(wrapper.classes()).toContain("w-fit");
            expect(wrapper.classes()).toContain("items-center");
            expect(wrapper.classes()).toContain("gap-0.5");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(KbdGroup, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("inline-flex");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(KbdGroup, { slots: { default: "Ctrl+K" } });
            expect(wrapper.text()).toBe("Ctrl+K");
        });
    });
});
