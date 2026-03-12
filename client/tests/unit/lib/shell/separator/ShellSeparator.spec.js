import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ShellSeparator from "@vueda/shell/separator/ShellSeparator.vue";

describe("lib/shell/separator/ShellSeparator.vue", () => {
    describe("rendering", () => {
        scopedIt("always has data-slot=separator", () => {
            const wrapper = mount(ShellSeparator);
            expect(wrapper.attributes("data-slot")).toBe("separator");
        });

        scopedIt("applies base classes", () => {
            const wrapper = mount(ShellSeparator);
            expect(wrapper.classes()).toContain("bg-border");
            expect(wrapper.classes()).toContain("shrink-0");
        });

        scopedIt("defaults to horizontal orientation", () => {
            const wrapper = mount(ShellSeparator);
            expect(wrapper.attributes("data-orientation")).toBe("horizontal");
        });

        scopedIt("reflects vertical orientation in data-orientation attribute", () => {
            const wrapper = mount(ShellSeparator, { props: { orientation: "vertical" } });
            expect(wrapper.attributes("data-orientation")).toBe("vertical");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(ShellSeparator, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("bg-border");
        });

        scopedIt("has role=none when decorative", () => {
            const wrapper = mount(ShellSeparator);
            // Reka Separator sets role="none" when decorative=true
            expect(wrapper.attributes("role")).toBe("none");
        });
    });
});
