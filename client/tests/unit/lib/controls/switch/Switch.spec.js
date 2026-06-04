import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Switch from "@vueda/controls/switch/Switch.vue";

describe("lib/controls/switch/Switch.vue", () => {
    describe("rendering", () => {
        scopedIt("has data-slot=switch on the root element", () => {
            const wrapper = mount(Switch);
            expect(wrapper.find('[data-slot="switch"]').exists()).toBe(true);
        });

        scopedIt("has data-slot=switch-thumb inside the root", () => {
            const wrapper = mount(Switch);
            expect(wrapper.find('[data-slot="switch-thumb"]').exists()).toBe(true);
        });

        scopedIt("applies base sizing and layout classes", () => {
            const wrapper = mount(Switch);
            const root = wrapper.find('[data-slot="switch"]');
            expect(root.classes()).toContain("inline-flex");
            expect(root.classes()).toContain("rounded-full");
        });

        scopedIt("merges custom class on the root", () => {
            const wrapper = mount(Switch, { props: { class: "my-switch" } });
            expect(wrapper.find('[data-slot="switch"]').classes()).toContain("my-switch");
        });
    });

    describe("state", () => {
        scopedIt("starts with data-state=unchecked by default", () => {
            const wrapper = mount(Switch);
            expect(wrapper.find('[data-slot="switch"]').attributes("data-state")).toBe("unchecked");
        });

        scopedIt("has data-state=checked when modelValue is true", () => {
            const wrapper = mount(Switch, { props: { modelValue: true } });
            expect(wrapper.find('[data-slot="switch"]').attributes("data-state")).toBe("checked");
        });

        scopedIt("emits update:modelValue when clicked", async () => {
            const wrapper = mount(Switch);
            await wrapper.find('[data-slot="switch"]').trigger("click");
            expect(wrapper.emitted("update:modelValue")).toBeTruthy();
        });
    });

    describe("disabled", () => {
        scopedIt("reflects disabled prop as data-disabled attribute", () => {
            const wrapper = mount(Switch, { props: { disabled: true } });
            expect(wrapper.find('[data-slot="switch"]').attributes("data-disabled")).toBeDefined();
        });
    });
});
