import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Spinner from "@vueda/feedback/spinner/Spinner.vue";

describe("lib/feedback/spinner/Spinner.vue", () => {
    describe("rendering", () => {
        scopedIt("renders a span element with spinner character", () => {
            const wrapper = mount(Spinner);
            expect(wrapper.element.tagName.toLowerCase()).toBe("span");
            expect(wrapper.text()).toBe("◌");
        });

        scopedIt("has role=status", () => {
            const wrapper = mount(Spinner);
            expect(wrapper.attributes("role")).toBe("status");
        });

        scopedIt("has aria-label=Loading", () => {
            const wrapper = mount(Spinner);
            expect(wrapper.attributes("aria-label")).toBe("Loading");
        });

        scopedIt("applies base classes", () => {
            const wrapper = mount(Spinner);
            expect(wrapper.classes()).toContain("animate-spin");
            expect(wrapper.classes()).toContain("size-4");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(Spinner, { props: { class: "size-8 text-primary" } });
            expect(wrapper.classes()).toContain("size-8");
            expect(wrapper.classes()).toContain("text-primary");
            expect(wrapper.classes()).toContain("animate-spin");
        });
    });
});
