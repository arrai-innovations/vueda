import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Badge from "@vueda/display/badge/Badge.vue";

describe("lib/display/badge/Badge.vue", () => {
    describe("rendering", () => {
        scopedIt("always has data-slot=badge", () => {
            const wrapper = mount(Badge);
            expect(wrapper.attributes("data-slot")).toBe("badge");
        });

        scopedIt("applies default variant classes", () => {
            const wrapper = mount(Badge);
            expect(wrapper.classes()).toContain("bg-primary");
            expect(wrapper.classes()).toContain("text-primary-foreground");
        });

        scopedIt("applies secondary variant classes", () => {
            const wrapper = mount(Badge, { props: { variant: "secondary" } });
            expect(wrapper.classes()).toContain("bg-secondary");
        });

        scopedIt("applies destructive variant classes", () => {
            const wrapper = mount(Badge, { props: { variant: "destructive" } });
            expect(wrapper.classes()).toContain("bg-destructive");
        });

        scopedIt("applies outline variant classes", () => {
            const wrapper = mount(Badge, { props: { variant: "outline" } });
            expect(wrapper.classes()).toContain("text-foreground");
        });

        scopedIt.each([
            ["info", "text-info", "bg-info/10", "var(--info)"],
            ["success", "text-success", "bg-success/10", "var(--success)"],
            ["warning", "text-warning", "bg-warning/10", "var(--warning)"],
        ])("applies tinted %s variant classes", (variant, textClass, surfaceClass, token) => {
            const wrapper = mount(Badge, { props: { variant } });
            const classes = wrapper.classes();
            expect(classes).toContain(textClass);
            expect(classes).toContain(surfaceClass);
            // The tinted tones paint a 50% tone hairline, so they must not also declare the
            // transparent hairline the solid fills use, or the two would race in the cascade.
            expect(classes).toContain(`[--vueda-hairline-color:color-mix(in_oklab,${token}_50%,transparent)]`);
            expect(classes).not.toContain("[--vueda-hairline-color:transparent]");
            expect(classes).not.toContain("hairline-border");
        });

        scopedIt.each(["default", "secondary", "destructive"])(
            "keeps the solid %s variant on a transparent hairline",
            (variant) => {
                const classes = mount(Badge, { props: { variant } }).classes();
                expect(classes).toContain("[--vueda-hairline-color:transparent]");
                expect(classes).not.toContain("text-info");
                expect(classes).not.toContain("text-success");
                expect(classes).not.toContain("text-warning");
            },
        );

        scopedIt("gives a tinted variant an anchor hover and active step", () => {
            const classes = mount(Badge, { props: { variant: "success" } }).classes();
            expect(classes).toContain("[a&]:hover:bg-success/20");
            expect(classes).toContain("[a&]:active:bg-success/25");
        });

        scopedIt("composes a tinted variant with the numeric recipe", () => {
            const classes = mount(Badge, { props: { variant: "warning", numeric: true } }).classes();
            expect(classes).toContain("text-warning");
            expect(classes).toContain("tabular-nums");
            expect(classes).toContain("px-1");
            expect(classes).not.toContain("px-2");
        });

        scopedIt("merges custom class while preserving variant classes", () => {
            const wrapper = mount(Badge, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("bg-primary");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(Badge, { slots: { default: "New" } });
            expect(wrapper.text()).toBe("New");
        });

        scopedIt("applies numeric recipe classes when numeric is true", () => {
            const wrapper = mount(Badge, { props: { numeric: true } });
            expect(wrapper.classes()).toContain("font-mono");
            expect(wrapper.classes()).toContain("tabular-nums");
            expect(wrapper.classes()).toContain("min-w-5");
            expect(wrapper.classes()).toContain("px-1");
            expect(wrapper.classes()).not.toContain("px-2");
        });

        scopedIt("uses default px-2 when numeric is false", () => {
            const wrapper = mount(Badge);
            expect(wrapper.classes()).toContain("px-2");
            expect(wrapper.classes()).not.toContain("font-mono");
            expect(wrapper.classes()).not.toContain("tabular-nums");
        });

        scopedIt("declares aria-invalid destructive ring on root", () => {
            const wrapper = mount(Badge);
            expect(wrapper.classes()).toContain("aria-invalid:hairline-destructive");
            expect(wrapper.classes()).toContain("aria-invalid:focus-ring-shadow-destructive");
        });
    });
});
