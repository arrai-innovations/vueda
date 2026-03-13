import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ControlNativeSelect from "@vueda/controls/native-select/ControlNativeSelect.vue";
import ControlNativeSelectOptGroup from "@vueda/controls/native-select/ControlNativeSelectOptGroup.vue";
import ControlNativeSelectOption from "@vueda/controls/native-select/ControlNativeSelectOption.vue";

describe("lib/controls/native-select/ControlNativeSelect.vue", () => {
    describe("ControlNativeSelect", () => {
        scopedIt("has data-slot=native-select-wrapper on the outer div", () => {
            const wrapper = mount(ControlNativeSelect);
            expect(wrapper.attributes("data-slot")).toBe("native-select-wrapper");
        });

        scopedIt("has data-slot=native-select on the inner select", () => {
            const wrapper = mount(ControlNativeSelect);
            expect(wrapper.find('[data-slot="native-select"]').exists()).toBe(true);
        });

        scopedIt("has data-slot=native-select-icon on the chevron", () => {
            const wrapper = mount(ControlNativeSelect);
            expect(wrapper.find('[data-slot="native-select-icon"]').exists()).toBe(true);
        });

        scopedIt("applies base styling classes to the select", () => {
            const wrapper = mount(ControlNativeSelect);
            const select = wrapper.find('[data-slot="native-select"]');
            expect(select.classes()).toContain("border-input");
            expect(select.classes()).toContain("rounded-md");
            expect(select.classes()).toContain("h-9");
        });

        scopedIt("merges custom class on the select", () => {
            const wrapper = mount(ControlNativeSelect, { props: { class: "my-select" } });
            expect(wrapper.find('[data-slot="native-select"]').classes()).toContain("my-select");
        });

        scopedIt("passes through attrs to the select element", () => {
            const wrapper = mount(ControlNativeSelect, { attrs: { disabled: true } });
            expect(wrapper.find('[data-slot="native-select"]').attributes("disabled")).toBeDefined();
        });

        scopedIt("renders slot content as options", () => {
            const wrapper = mount(ControlNativeSelect, {
                slots: { default: '<option value="a">Alpha</option>' },
            });
            const options = wrapper.find('[data-slot="native-select"]').findAll("option");
            expect(options).toHaveLength(1);
            expect(options[0].text()).toBe("Alpha");
        });
    });

    describe("ControlNativeSelect v-model", () => {
        scopedIt("reflects modelValue as the select value", async () => {
            const wrapper = mount(ControlNativeSelect, {
                props: { modelValue: "b" },
                slots: {
                    default: '<option value="a">A</option><option value="b">B</option>',
                },
            });
            expect(wrapper.find('[data-slot="native-select"]').element.value).toBe("b");
        });

        scopedIt("emits update:modelValue on change", async () => {
            const wrapper = mount(ControlNativeSelect, {
                slots: { default: '<option value="a">A</option><option value="b">B</option>' },
            });
            const select = wrapper.find('[data-slot="native-select"]');
            await select.setValue("b");
            expect(wrapper.emitted("update:modelValue")).toBeTruthy();
        });
    });

    describe("ControlNativeSelectOption", () => {
        scopedIt("renders as a native option element", () => {
            const wrapper = mount(ControlNativeSelectOption);
            expect(wrapper.element.tagName).toBe("OPTION");
        });

        scopedIt("has data-slot=native-select-option", () => {
            const wrapper = mount(ControlNativeSelectOption);
            expect(wrapper.attributes("data-slot")).toBe("native-select-option");
        });

        scopedIt("applies popover background classes", () => {
            const wrapper = mount(ControlNativeSelectOption);
            expect(wrapper.classes()).toContain("bg-popover");
            expect(wrapper.classes()).toContain("text-popover-foreground");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlNativeSelectOption, { props: { class: "my-option" } });
            expect(wrapper.classes()).toContain("my-option");
        });

        scopedIt("renders slot content as option text", () => {
            const wrapper = mount(ControlNativeSelectOption, { slots: { default: "Choice A" } });
            expect(wrapper.text()).toBe("Choice A");
        });
    });

    describe("ControlNativeSelectOptGroup", () => {
        scopedIt("renders as a native optgroup element", () => {
            const wrapper = mount(ControlNativeSelectOptGroup);
            expect(wrapper.element.tagName).toBe("OPTGROUP");
        });

        scopedIt("has data-slot=native-select-optgroup", () => {
            const wrapper = mount(ControlNativeSelectOptGroup);
            expect(wrapper.attributes("data-slot")).toBe("native-select-optgroup");
        });

        scopedIt("applies popover background classes", () => {
            const wrapper = mount(ControlNativeSelectOptGroup);
            expect(wrapper.classes()).toContain("bg-popover");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlNativeSelectOptGroup, { props: { class: "my-group" } });
            expect(wrapper.classes()).toContain("my-group");
        });
    });
});
