import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Alert from "@vueda/feedback/alert/Alert.vue";
import AlertActions from "@vueda/feedback/alert/AlertActions.vue";
import AlertDescription from "@vueda/feedback/alert/AlertDescription.vue";
import AlertTitle from "@vueda/feedback/alert/AlertTitle.vue";

describe("lib/feedback/alert/Alert.vue", () => {
    describe("Alert", () => {
        scopedIt("renders as a <div>", () => {
            const wrapper = mount(Alert);
            expect(wrapper.element.tagName).toBe("DIV");
        });

        scopedIt("always has data-slot=alert", () => {
            const wrapper = mount(Alert);
            expect(wrapper.attributes("data-slot")).toBe("alert");
        });

        scopedIt("has role=alert", () => {
            const wrapper = mount(Alert);
            expect(wrapper.attributes("role")).toBe("alert");
        });

        scopedIt("applies default variant classes", () => {
            const wrapper = mount(Alert);
            expect(wrapper.classes()).toContain("bg-card");
            expect(wrapper.classes()).toContain("text-card-foreground");
        });

        scopedIt("applies destructive variant classes", () => {
            const wrapper = mount(Alert, { props: { variant: "destructive" } });
            expect(wrapper.classes()).toContain("text-destructive");
        });

        scopedIt("uses card-radius token rather than the generic rounded-lg", () => {
            const wrapper = mount(Alert);
            expect(wrapper.classes()).toContain("rounded-vueda-card");
            expect(wrapper.classes()).not.toContain("rounded-lg");
        });

        scopedIt("spans icon across title and description rows", () => {
            const wrapper = mount(Alert);
            expect(wrapper.classes()).toContain("[&>svg]:row-span-2");
        });

        scopedIt("tints description for warning variant", () => {
            const wrapper = mount(Alert, { props: { variant: "warning" } });
            expect(wrapper.classes()).toContain("*:data-[slot=alert-description]:text-warning/90");
        });

        scopedIt("tints description for info variant", () => {
            const wrapper = mount(Alert, { props: { variant: "info" } });
            expect(wrapper.classes()).toContain("*:data-[slot=alert-description]:text-info/90");
        });

        scopedIt("tints description for success variant", () => {
            const wrapper = mount(Alert, { props: { variant: "success" } });
            expect(wrapper.classes()).toContain("*:data-[slot=alert-description]:text-success/90");
        });

        scopedIt("merges custom class while preserving variant classes", () => {
            const wrapper = mount(Alert, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("bg-card");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(Alert, { slots: { default: "Alert message" } });
            expect(wrapper.text()).toBe("Alert message");
        });
    });

    describe("AlertTitle", () => {
        scopedIt("renders as a <div>", () => {
            const wrapper = mount(AlertTitle);
            expect(wrapper.element.tagName).toBe("DIV");
        });

        scopedIt("always has data-slot=alert-title", () => {
            const wrapper = mount(AlertTitle);
            expect(wrapper.attributes("data-slot")).toBe("alert-title");
        });

        scopedIt("applies base classes", () => {
            const wrapper = mount(AlertTitle);
            expect(wrapper.classes()).toContain("font-medium");
            expect(wrapper.classes()).toContain("tracking-tight");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(AlertTitle, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("font-medium");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(AlertTitle, { slots: { default: "Title text" } });
            expect(wrapper.text()).toBe("Title text");
        });
    });

    describe("AlertDescription", () => {
        scopedIt("renders as a <div>", () => {
            const wrapper = mount(AlertDescription);
            expect(wrapper.element.tagName).toBe("DIV");
        });

        scopedIt("always has data-slot=alert-description", () => {
            const wrapper = mount(AlertDescription);
            expect(wrapper.attributes("data-slot")).toBe("alert-description");
        });

        scopedIt("applies base classes", () => {
            const wrapper = mount(AlertDescription);
            expect(wrapper.classes()).toContain("text-muted-foreground");
            expect(wrapper.classes()).toContain("text-sm");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(AlertDescription, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("text-muted-foreground");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(AlertDescription, { slots: { default: "Description text" } });
            expect(wrapper.text()).toBe("Description text");
        });
    });

    describe("AlertActions", () => {
        scopedIt("renders as a <div>", () => {
            const wrapper = mount(AlertActions);
            expect(wrapper.element.tagName).toBe("DIV");
        });

        scopedIt("always has data-slot=alert-actions", () => {
            const wrapper = mount(AlertActions);
            expect(wrapper.attributes("data-slot")).toBe("alert-actions");
        });

        scopedIt("aligns under the alert title/description column", () => {
            const wrapper = mount(AlertActions);
            expect(wrapper.classes()).toContain("col-start-2");
            expect(wrapper.classes()).toContain("inline-flex");
            expect(wrapper.classes()).toContain("gap-2");
            expect(wrapper.classes()).toContain("mt-2");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(AlertActions, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("col-start-2");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(AlertActions, { slots: { default: "Actions" } });
            expect(wrapper.text()).toBe("Actions");
        });
    });
});
