import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import FeedbackAlert from "@vueda/feedback/alert/FeedbackAlert.vue";
import FeedbackAlertDescription from "@vueda/feedback/alert/FeedbackAlertDescription.vue";
import FeedbackAlertTitle from "@vueda/feedback/alert/FeedbackAlertTitle.vue";

describe("lib/feedback/alert/FeedbackAlert.vue", () => {
    describe("FeedbackAlert", () => {
        scopedIt("renders as a <div>", () => {
            const wrapper = mount(FeedbackAlert);
            expect(wrapper.element.tagName).toBe("DIV");
        });

        scopedIt("always has data-slot=alert", () => {
            const wrapper = mount(FeedbackAlert);
            expect(wrapper.attributes("data-slot")).toBe("alert");
        });

        scopedIt("has role=alert", () => {
            const wrapper = mount(FeedbackAlert);
            expect(wrapper.attributes("role")).toBe("alert");
        });

        scopedIt("applies default variant classes", () => {
            const wrapper = mount(FeedbackAlert);
            expect(wrapper.classes()).toContain("bg-card");
            expect(wrapper.classes()).toContain("text-card-foreground");
        });

        scopedIt("applies destructive variant classes", () => {
            const wrapper = mount(FeedbackAlert, { props: { variant: "destructive" } });
            expect(wrapper.classes()).toContain("text-destructive");
        });

        scopedIt("merges custom class while preserving variant classes", () => {
            const wrapper = mount(FeedbackAlert, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("bg-card");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(FeedbackAlert, { slots: { default: "Alert message" } });
            expect(wrapper.text()).toBe("Alert message");
        });
    });

    describe("FeedbackAlertTitle", () => {
        scopedIt("renders as a <div>", () => {
            const wrapper = mount(FeedbackAlertTitle);
            expect(wrapper.element.tagName).toBe("DIV");
        });

        scopedIt("always has data-slot=alert-title", () => {
            const wrapper = mount(FeedbackAlertTitle);
            expect(wrapper.attributes("data-slot")).toBe("alert-title");
        });

        scopedIt("applies base classes", () => {
            const wrapper = mount(FeedbackAlertTitle);
            expect(wrapper.classes()).toContain("font-medium");
            expect(wrapper.classes()).toContain("tracking-tight");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(FeedbackAlertTitle, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("font-medium");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(FeedbackAlertTitle, { slots: { default: "Title text" } });
            expect(wrapper.text()).toBe("Title text");
        });
    });

    describe("FeedbackAlertDescription", () => {
        scopedIt("renders as a <div>", () => {
            const wrapper = mount(FeedbackAlertDescription);
            expect(wrapper.element.tagName).toBe("DIV");
        });

        scopedIt("always has data-slot=alert-description", () => {
            const wrapper = mount(FeedbackAlertDescription);
            expect(wrapper.attributes("data-slot")).toBe("alert-description");
        });

        scopedIt("applies base classes", () => {
            const wrapper = mount(FeedbackAlertDescription);
            expect(wrapper.classes()).toContain("text-muted-foreground");
            expect(wrapper.classes()).toContain("text-sm");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(FeedbackAlertDescription, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("text-muted-foreground");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(FeedbackAlertDescription, { slots: { default: "Description text" } });
            expect(wrapper.text()).toBe("Description text");
        });
    });
});
