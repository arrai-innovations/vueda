import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import FeedbackSpinner from "@vueda/feedback/spinner/FeedbackSpinner.vue";

describe("lib/feedback/spinner/FeedbackSpinner.vue", () => {
    describe("rendering", () => {
        scopedIt("renders a span element with spinner character", () => {
            const wrapper = mount(FeedbackSpinner);
            expect(wrapper.element.tagName.toLowerCase()).toBe("span");
            expect(wrapper.text()).toBe("◌");
        });

        scopedIt("has role=status", () => {
            const wrapper = mount(FeedbackSpinner);
            expect(wrapper.attributes("role")).toBe("status");
        });

        scopedIt("has aria-label=Loading", () => {
            const wrapper = mount(FeedbackSpinner);
            expect(wrapper.attributes("aria-label")).toBe("Loading");
        });

        scopedIt("applies base classes", () => {
            const wrapper = mount(FeedbackSpinner);
            expect(wrapper.classes()).toContain("animate-spin");
            expect(wrapper.classes()).toContain("size-4");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(FeedbackSpinner, { props: { class: "size-8 text-primary" } });
            expect(wrapper.classes()).toContain("size-8");
            expect(wrapper.classes()).toContain("text-primary");
            expect(wrapper.classes()).toContain("animate-spin");
        });
    });
});
