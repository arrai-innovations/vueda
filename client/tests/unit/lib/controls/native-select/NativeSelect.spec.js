import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import NativeSelect from "@vueda/controls/native-select/NativeSelect.vue";
import NativeSelectOptGroup from "@vueda/controls/native-select/NativeSelectOptGroup.vue";
import NativeSelectOption from "@vueda/controls/native-select/NativeSelectOption.vue";

describe("lib/controls/native-select/NativeSelect.vue", () => {
    describe("NativeSelect", () => {
        scopedIt("has data-slot=native-select-wrapper on the outer div", () => {
            const wrapper = mount(NativeSelect);
            expect(wrapper.attributes("data-slot")).toBe("native-select-wrapper");
        });

        scopedIt("has data-slot=native-select on the inner select", () => {
            const wrapper = mount(NativeSelect);
            expect(wrapper.find('[data-slot="native-select"]').exists()).toBe(true);
        });

        scopedIt("has data-slot=native-select-icon on the chevron", () => {
            const wrapper = mount(NativeSelect);
            expect(wrapper.find('[data-slot="native-select-icon"]').exists()).toBe(true);
        });

        scopedIt("applies base styling classes to the select", () => {
            const wrapper = mount(NativeSelect);
            const select = wrapper.find('[data-slot="native-select"]');
            expect(select.classes()).toContain("hairline");
            expect(select.classes()).toContain("rounded-vueda-field");
            expect(select.classes()).toContain("h-vueda-control");
        });

        scopedIt("merges custom class on the select", () => {
            const wrapper = mount(NativeSelect, { props: { class: "my-select" } });
            expect(wrapper.find('[data-slot="native-select"]').classes()).toContain("my-select");
        });

        scopedIt("passes through attrs to the select element", () => {
            const wrapper = mount(NativeSelect, { attrs: { disabled: true } });
            expect(wrapper.find('[data-slot="native-select"]').attributes("disabled")).toBeDefined();
        });

        scopedIt("renders slot content as options", () => {
            const wrapper = mount(NativeSelect, {
                slots: { default: '<option value="a">Alpha</option>' },
            });
            const options = wrapper.find('[data-slot="native-select"]').findAll("option");
            expect(options).toHaveLength(1);
            expect(options[0].text()).toBe("Alpha");
        });
    });

    describe("NativeSelect v-model", () => {
        scopedIt("reflects modelValue as the select value", async () => {
            const wrapper = mount(NativeSelect, {
                props: { modelValue: "b" },
                slots: {
                    default: '<option value="a">A</option><option value="b">B</option>',
                },
            });
            expect(wrapper.find('[data-slot="native-select"]').element.value).toBe("b");
        });

        scopedIt("emits update:modelValue on change", async () => {
            const wrapper = mount(NativeSelect, {
                slots: { default: '<option value="a">A</option><option value="b">B</option>' },
            });
            const select = wrapper.find('[data-slot="native-select"]');
            await select.setValue("b");
            expect(wrapper.emitted("update:modelValue")).toBeTruthy();
        });
    });

    describe("NativeSelectOption", () => {
        scopedIt("renders as a native option element", () => {
            const wrapper = mount(NativeSelectOption);
            expect(wrapper.element.tagName).toBe("OPTION");
        });

        scopedIt("has data-slot=native-select-option", () => {
            const wrapper = mount(NativeSelectOption);
            expect(wrapper.attributes("data-slot")).toBe("native-select-option");
        });

        scopedIt("applies popover background classes", () => {
            const wrapper = mount(NativeSelectOption);
            expect(wrapper.classes()).toContain("bg-popover");
            expect(wrapper.classes()).toContain("text-popover-foreground");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(NativeSelectOption, { props: { class: "my-option" } });
            expect(wrapper.classes()).toContain("my-option");
        });

        scopedIt("renders slot content as option text", () => {
            const wrapper = mount(NativeSelectOption, { slots: { default: "Choice A" } });
            expect(wrapper.text()).toBe("Choice A");
        });
    });

    describe("NativeSelectOptGroup", () => {
        scopedIt("renders as a native optgroup element", () => {
            const wrapper = mount(NativeSelectOptGroup);
            expect(wrapper.element.tagName).toBe("OPTGROUP");
        });

        scopedIt("has data-slot=native-select-optgroup", () => {
            const wrapper = mount(NativeSelectOptGroup);
            expect(wrapper.attributes("data-slot")).toBe("native-select-optgroup");
        });

        scopedIt("applies popover background classes", () => {
            const wrapper = mount(NativeSelectOptGroup);
            expect(wrapper.classes()).toContain("bg-popover");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(NativeSelectOptGroup, { props: { class: "my-group" } });
            expect(wrapper.classes()).toContain("my-group");
        });
    });
});
