import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import FeedbackProgress from "@vueda/feedback/progress/FeedbackProgress.vue";

describe("lib/feedback/progress/FeedbackProgress.vue", () => {
    describe("rendering", () => {
        scopedIt("always has data-slot=progress on the root element", () => {
            const wrapper = mount(FeedbackProgress);
            expect(wrapper.attributes("data-slot")).toBe("progress");
        });

        scopedIt("applies base classes", () => {
            const wrapper = mount(FeedbackProgress);
            expect(wrapper.classes()).toContain("rounded-full");
            expect(wrapper.classes()).toContain("overflow-hidden");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(FeedbackProgress, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("rounded-full");
        });

        scopedIt("renders the progress indicator with data-slot=progress-indicator", () => {
            const wrapper = mount(FeedbackProgress);
            const indicator = wrapper.find("[data-slot='progress-indicator']");
            expect(indicator.exists()).toBe(true);
        });

        scopedIt("sets indicator transform based on modelValue", () => {
            const wrapper = mount(FeedbackProgress, { props: { modelValue: 75 } });
            const indicator = wrapper.find("[data-slot='progress-indicator']");
            expect(indicator.attributes("style")).toContain("translateX(-25%)");
        });

        scopedIt("sets indicator transform to -100% when modelValue is 0", () => {
            const wrapper = mount(FeedbackProgress, { props: { modelValue: 0 } });
            const indicator = wrapper.find("[data-slot='progress-indicator']");
            expect(indicator.attributes("style")).toContain("translateX(-100%)");
        });

        scopedIt("sets indicator transform to 0% when modelValue equals max", () => {
            const wrapper = mount(FeedbackProgress, { props: { modelValue: 100 } });
            const indicator = wrapper.find("[data-slot='progress-indicator']");
            expect(indicator.attributes("style")).toContain("translateX(-0%)");
        });
    });
});
