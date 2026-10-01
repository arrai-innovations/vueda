import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Progress from "@vueda/feedback/progress/Progress.vue";

describe("lib/feedback/progress/Progress.vue", () => {
    describe("rendering", () => {
        scopedIt("always has data-slot=progress on the root element", () => {
            const wrapper = mount(Progress);
            expect(wrapper.attributes("data-slot")).toBe("progress");
        });

        scopedIt("applies base classes", () => {
            const wrapper = mount(Progress);
            expect(wrapper.classes()).toContain("rounded-full");
            expect(wrapper.classes()).toContain("overflow-hidden");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(Progress, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("rounded-full");
        });

        scopedIt("renders the progress indicator with data-slot=progress-indicator", () => {
            const wrapper = mount(Progress);
            const indicator = wrapper.find("[data-slot='progress-indicator']");
            expect(indicator.exists()).toBe(true);
        });

        scopedIt("sets indicator transform based on modelValue", () => {
            const wrapper = mount(Progress, { props: { modelValue: 75, max: 100 } });
            const indicator = wrapper.find("[data-slot='progress-indicator']");
            expect(indicator.attributes("style")).toContain("translateX(-25%)");
        });

        scopedIt("sets indicator transform to -100% when modelValue is 0", () => {
            const wrapper = mount(Progress, { props: { modelValue: 0, max: 100 } });
            const indicator = wrapper.find("[data-slot='progress-indicator']");
            expect(indicator.attributes("style")).toContain("translateX(-100%)");
        });

        scopedIt("scales the indicator transform by max", () => {
            const wrapper = mount(Progress, { props: { modelValue: 50, max: 200 } });
            const indicator = wrapper.find("[data-slot='progress-indicator']");
            expect(indicator.attributes("style")).toContain("translateX(-75%)");
        });

        scopedIt("sets indicator transform to 0% when modelValue equals max", () => {
            const wrapper = mount(Progress, { props: { modelValue: 100, max: 100 } });
            const indicator = wrapper.find("[data-slot='progress-indicator']");
            expect(indicator.attributes("style")).toContain("translateX(-0%)");
        });
    });

    describe("size variants", () => {
        scopedIt("uses h-2 by default", () => {
            const wrapper = mount(Progress);
            expect(wrapper.classes()).toContain("h-2");
        });

        scopedIt("applies h-1 when size is sm", () => {
            const wrapper = mount(Progress, { props: { size: "sm" } });
            expect(wrapper.classes()).toContain("h-1");
            expect(wrapper.classes()).not.toContain("h-2");
        });

        scopedIt("applies h-3 when size is lg", () => {
            const wrapper = mount(Progress, { props: { size: "lg" } });
            expect(wrapper.classes()).toContain("h-3");
            expect(wrapper.classes()).not.toContain("h-2");
        });

        scopedIt("forwards size as data-size attribute", () => {
            const wrapper = mount(Progress, { props: { size: "lg" } });
            expect(wrapper.attributes("data-size")).toBe("lg");
        });
    });

    describe("tone variants", () => {
        scopedIt("uses primary track and indicator by default", () => {
            const wrapper = mount(Progress);
            const indicator = wrapper.find("[data-slot='progress-indicator']");
            expect(wrapper.classes()).toContain("bg-primary/20");
            expect(indicator.classes()).toContain("bg-primary");
        });

        scopedIt("applies success tone classes", () => {
            const wrapper = mount(Progress, { props: { tone: "success" } });
            const indicator = wrapper.find("[data-slot='progress-indicator']");
            expect(wrapper.classes()).toContain("bg-success/20");
            expect(wrapper.classes()).not.toContain("bg-primary/20");
            expect(indicator.classes()).toContain("bg-success");
            expect(indicator.classes()).not.toContain("bg-primary");
        });

        scopedIt("applies warning tone classes", () => {
            const wrapper = mount(Progress, { props: { tone: "warning" } });
            const indicator = wrapper.find("[data-slot='progress-indicator']");
            expect(wrapper.classes()).toContain("bg-warning/20");
            expect(indicator.classes()).toContain("bg-warning");
        });

        scopedIt("applies destructive tone classes", () => {
            const wrapper = mount(Progress, { props: { tone: "destructive" } });
            const indicator = wrapper.find("[data-slot='progress-indicator']");
            expect(wrapper.classes()).toContain("bg-destructive/20");
            expect(indicator.classes()).toContain("bg-destructive");
        });
    });

    describe("indeterminate state", () => {
        scopedIt("is indeterminate when modelValue is omitted", () => {
            const wrapper = mount(Progress);
            const indicator = wrapper.find("[data-slot='progress-indicator']");
            expect(wrapper.attributes("data-state")).toBe("indeterminate");
            expect(indicator.attributes("style")).toBeUndefined();
        });

        scopedIt("is indeterminate when modelValue is null, even with max set", () => {
            const wrapper = mount(Progress, { props: { modelValue: null, max: 200 } });
            const indicator = wrapper.find("[data-slot='progress-indicator']");
            expect(wrapper.attributes("data-state")).toBe("indeterminate");
            expect(indicator.attributes("style")).toBeUndefined();
        });

        scopedIt("is determinate when modelValue is set and max is omitted", () => {
            const wrapper = mount(Progress, { props: { modelValue: 50 } });
            const indicator = wrapper.find("[data-slot='progress-indicator']");
            expect(wrapper.attributes("data-state")).toBe("loading");
            expect(indicator.attributes("style")).toContain("translateX(-50%)");
        });

        scopedIt("is determinate at a modelValue of 0", () => {
            const wrapper = mount(Progress, { props: { modelValue: 0 } });
            expect(wrapper.attributes("data-state")).toBe("loading");
        });

        scopedIt("ships indeterminate animation classes on the indicator", () => {
            const wrapper = mount(Progress);
            const indicator = wrapper.find("[data-slot='progress-indicator']");
            expect(indicator.classes()).toContain("data-[state=indeterminate]:w-2/5");
            expect(indicator.classes()).toContain("data-[state=indeterminate]:animate-vueda-progress-slide");
        });
    });
});
