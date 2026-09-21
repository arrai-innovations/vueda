import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Toggle from "@vueda/controls/toggle/Toggle.vue";

describe("lib/controls/toggle/Toggle.vue", () => {
    describe("pressed state", () => {
        scopedIt("reflects controlled pressed changes and emits the requested next value", async () => {
            const wrapper = mount(Toggle, { props: { pressed: true } });
            expect(wrapper.attributes("data-state")).toBe("on");
            expect(wrapper.attributes("aria-pressed")).toBe("true");

            await wrapper.trigger("click");
            expect(wrapper.emitted("update:pressed")).toEqual([[false]]);
            expect(wrapper.attributes("data-state")).toBe("on");

            await wrapper.setProps({ pressed: false });
            expect(wrapper.attributes("data-state")).toBe("off");
            expect(wrapper.attributes("aria-pressed")).toBe("false");
        });

        scopedIt("starts from defaultPressed and toggles without a controlled prop", async () => {
            const wrapper = mount(Toggle, { props: { defaultPressed: true } });
            expect(wrapper.attributes("data-state")).toBe("on");
            await wrapper.trigger("click");
            expect(wrapper.attributes("data-state")).toBe("off");
            await wrapper.trigger("click");
            expect(wrapper.attributes("data-state")).toBe("on");
            expect(wrapper.emitted("update:pressed")).toEqual([[false], [true]]);
        });

        scopedIt("preserves a disabled pressed value without emitting a change", async () => {
            const wrapper = mount(Toggle, { props: { defaultPressed: true, disabled: true } });
            expect(wrapper.attributes("data-state")).toBe("on");
            await wrapper.trigger("click");
            expect(wrapper.attributes("data-state")).toBe("on");
            expect(wrapper.emitted("update:pressed")).toBeUndefined();
        });
    });

    describe("rendering", () => {
        scopedIt("always has data-slot=toggle", () => {
            const wrapper = mount(Toggle);
            expect(wrapper.attributes("data-slot")).toBe("toggle");
        });

        scopedIt("applies default variant and size classes", () => {
            const wrapper = mount(Toggle);
            expect(wrapper.classes()).toContain("inline-flex");
            expect(wrapper.classes()).toContain("h-vueda-control");
        });

        scopedIt("applies outline variant classes", () => {
            const wrapper = mount(Toggle, { props: { variant: "outline" } });
            expect(wrapper.classes()).toContain("hairline");
            expect(wrapper.classes()).toContain("hairline-border-strong");
            expect(wrapper.classes()).toContain("hover:hairline-foreground");
        });

        scopedIt("applies sm size classes", () => {
            const wrapper = mount(Toggle, { props: { size: "sm" } });
            expect(wrapper.classes()).toContain("h-vueda-control-sm");
        });

        scopedIt("applies lg size classes", () => {
            const wrapper = mount(Toggle, { props: { size: "lg" } });
            expect(wrapper.classes()).toContain("h-vueda-control-lg");
        });

        scopedIt("merges custom class while preserving base classes", () => {
            const wrapper = mount(Toggle, { props: { class: "my-custom-class" } });
            expect(wrapper.classes()).toContain("my-custom-class");
            expect(wrapper.classes()).toContain("inline-flex");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(Toggle, { slots: { default: "Toggle me" } });
            expect(wrapper.text()).toBe("Toggle me");
        });
    });
});
