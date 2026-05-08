import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Checkbox from "@vueda/controls/checkbox/Checkbox.vue";

describe("lib/controls/checkbox/Checkbox.vue", () => {
    describe("rendering", () => {
        scopedIt("has data-slot=checkbox on the root element", () => {
            const wrapper = mount(Checkbox);
            expect(wrapper.find('[data-slot="checkbox"]').exists()).toBe(true);
        });

        scopedIt("has data-slot=checkbox-indicator when checked", () => {
            // CheckboxIndicator only renders when state is checked or indeterminate.
            const wrapper = mount(Checkbox, { props: { modelValue: true } });
            expect(wrapper.find('[data-slot="checkbox-indicator"]').exists()).toBe(true);
        });

        scopedIt("applies base sizing classes", () => {
            const wrapper = mount(Checkbox);
            const root = wrapper.find('[data-slot="checkbox"]');
            expect(root.classes()).toContain("size-6");
            expect(root.classes()).toContain("rounded-vueda-checkbox");
        });

        scopedIt("merges custom class on the root", () => {
            const wrapper = mount(Checkbox, { props: { class: "my-checkbox" } });
            expect(wrapper.find('[data-slot="checkbox"]').classes()).toContain("my-checkbox");
        });
    });

    describe("state", () => {
        scopedIt("starts with data-state=unchecked by default", () => {
            const wrapper = mount(Checkbox);
            expect(wrapper.find('[data-slot="checkbox"]').attributes("data-state")).toBe("unchecked");
        });

        scopedIt("has data-state=checked when modelValue is true", () => {
            const wrapper = mount(Checkbox, { props: { modelValue: true } });
            expect(wrapper.find('[data-slot="checkbox"]').attributes("data-state")).toBe("checked");
        });

        scopedIt("emits update:modelValue when clicked", async () => {
            const wrapper = mount(Checkbox);
            await wrapper.find('[data-slot="checkbox"]').trigger("click");
            expect(wrapper.emitted("update:modelValue")).toBeTruthy();
        });
    });

    describe("disabled", () => {
        scopedIt("reflects disabled prop as data-disabled attribute", () => {
            const wrapper = mount(Checkbox, { props: { disabled: true } });
            expect(wrapper.find('[data-slot="checkbox"]').attributes("data-disabled")).toBeDefined();
        });
    });
});
