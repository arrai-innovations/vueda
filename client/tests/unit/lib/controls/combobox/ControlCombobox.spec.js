import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ControlCombobox from "@vueda/controls/combobox/ControlCombobox.vue";
import ControlComboboxAnchor from "@vueda/controls/combobox/ControlComboboxAnchor.vue";
import ControlComboboxEmpty from "@vueda/controls/combobox/ControlComboboxEmpty.vue";
import ControlComboboxGroup from "@vueda/controls/combobox/ControlComboboxGroup.vue";
import ControlComboboxInput from "@vueda/controls/combobox/ControlComboboxInput.vue";
import ControlComboboxItem from "@vueda/controls/combobox/ControlComboboxItem.vue";
import ControlComboboxItemIndicator from "@vueda/controls/combobox/ControlComboboxItemIndicator.vue";
import ControlComboboxList from "@vueda/controls/combobox/ControlComboboxList.vue";
import ControlComboboxSeparator from "@vueda/controls/combobox/ControlComboboxSeparator.vue";
import ControlComboboxTrigger from "@vueda/controls/combobox/ControlComboboxTrigger.vue";
import ControlComboboxViewport from "@vueda/controls/combobox/ControlComboboxViewport.vue";

vi.mock("reka-ui", async (importOriginal) => {
    const actual = await importOriginal();
    const { defineComponent, h } = await import("vue");
    const makePassthrough = (name, defaultTag = "div") =>
        defineComponent({
            name,
            setup(_, { slots, attrs }) {
                return () => h(defaultTag, attrs, slots.default ? slots.default({}) : undefined);
            },
        });
    return {
        ...actual,
        ComboboxRoot: defineComponent({
            name: "ComboboxRoot",
            setup(_, { slots, attrs }) {
                return () => h("div", attrs, slots.default ? slots.default({ modelValue: undefined }) : undefined);
            },
        }),
        ComboboxAnchor: makePassthrough("ComboboxAnchor"),
        ComboboxEmpty: makePassthrough("ComboboxEmpty"),
        ComboboxGroup: makePassthrough("ComboboxGroup"),
        ComboboxLabel: makePassthrough("ComboboxLabel", "span"),
        ComboboxInput: makePassthrough("ComboboxInput", "input"),
        ComboboxItem: makePassthrough("ComboboxItem"),
        ComboboxItemIndicator: makePassthrough("ComboboxItemIndicator"),
        ComboboxContent: makePassthrough("ComboboxContent"),
        ComboboxPortal: makePassthrough("ComboboxPortal"),
        ComboboxSeparator: makePassthrough("ComboboxSeparator"),
        ComboboxTrigger: makePassthrough("ComboboxTrigger", "button"),
        ComboboxViewport: makePassthrough("ComboboxViewport"),
    };
});

describe("lib/controls/combobox/ControlCombobox.vue", () => {
    describe("ControlCombobox", () => {
        scopedIt("has data-slot=combobox", () => {
            const wrapper = mount(ControlCombobox);
            expect(wrapper.find('[data-slot="combobox"]').exists()).toBe(true);
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlCombobox, { slots: { default: "<span>content</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlCombobox, { props: { class: "my-combo" } });
            expect(wrapper.find('[data-slot="combobox"]').classes()).toContain("my-combo");
        });
    });

    describe("ControlComboboxAnchor", () => {
        scopedIt("has data-slot=combobox-anchor", () => {
            const wrapper = mount(ControlComboboxAnchor);
            expect(wrapper.attributes("data-slot")).toBe("combobox-anchor");
        });

        scopedIt("applies w-[200px] class", () => {
            const wrapper = mount(ControlComboboxAnchor);
            expect(wrapper.classes()).toContain("w-[200px]");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlComboboxAnchor, { props: { class: "w-full" } });
            expect(wrapper.classes()).toContain("w-full");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlComboboxAnchor, { slots: { default: "<span>x</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ControlComboboxEmpty", () => {
        scopedIt("has data-slot=combobox-empty", () => {
            const wrapper = mount(ControlComboboxEmpty);
            expect(wrapper.attributes("data-slot")).toBe("combobox-empty");
        });

        scopedIt("applies py-6 and text-center classes", () => {
            const wrapper = mount(ControlComboboxEmpty);
            expect(wrapper.classes()).toContain("py-6");
            expect(wrapper.classes()).toContain("text-center");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlComboboxEmpty, { props: { class: "my-empty" } });
            expect(wrapper.classes()).toContain("my-empty");
        });
    });

    describe("ControlComboboxGroup", () => {
        scopedIt("has data-slot=combobox-group", () => {
            const wrapper = mount(ControlComboboxGroup);
            expect(wrapper.attributes("data-slot")).toBe("combobox-group");
        });

        scopedIt("applies overflow-hidden and p-1 classes", () => {
            const wrapper = mount(ControlComboboxGroup);
            expect(wrapper.classes()).toContain("overflow-hidden");
            expect(wrapper.classes()).toContain("p-1");
        });

        scopedIt("renders heading when provided", () => {
            const wrapper = mount(ControlComboboxGroup, { props: { heading: "Fruits" } });
            expect(wrapper.text()).toContain("Fruits");
        });

        scopedIt("does not render heading element when not provided", () => {
            const wrapper = mount(ControlComboboxGroup);
            expect(wrapper.find("span").exists()).toBe(false);
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlComboboxGroup, { slots: { default: "<div>item</div>" } });
            expect(wrapper.find("div > div").exists()).toBe(true);
        });
    });

    describe("ControlComboboxInput", () => {
        scopedIt("has data-slot=combobox-input-wrapper outer div", () => {
            const wrapper = mount(ControlComboboxInput);
            expect(wrapper.find('[data-slot="combobox-input-wrapper"]').exists()).toBe(true);
        });

        scopedIt("has data-slot=combobox-input on the input", () => {
            const wrapper = mount(ControlComboboxInput);
            expect(wrapper.find('[data-slot="combobox-input"]').exists()).toBe(true);
        });

        scopedIt("applies h-9 and border-b to wrapper", () => {
            const wrapper = mount(ControlComboboxInput);
            const wrapperEl = wrapper.find('[data-slot="combobox-input-wrapper"]');
            expect(wrapperEl.classes()).toContain("h-9");
            expect(wrapperEl.classes()).toContain("border-b");
        });

        scopedIt("merges custom class on input", () => {
            const wrapper = mount(ControlComboboxInput, { props: { class: "my-input" } });
            expect(wrapper.find('[data-slot="combobox-input"]').classes()).toContain("my-input");
        });
    });

    describe("ControlComboboxItem", () => {
        scopedIt("has data-slot=combobox-item", () => {
            const wrapper = mount(ControlComboboxItem, { props: { value: "x" } });
            expect(wrapper.attributes("data-slot")).toBe("combobox-item");
        });

        scopedIt("applies rounded-sm and text-sm classes", () => {
            const wrapper = mount(ControlComboboxItem, { props: { value: "x" } });
            expect(wrapper.classes()).toContain("rounded-sm");
            expect(wrapper.classes()).toContain("text-sm");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlComboboxItem, {
                props: { value: "x", class: "my-item" },
            });
            expect(wrapper.classes()).toContain("my-item");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlComboboxItem, {
                props: { value: "x" },
                slots: { default: "<span>label</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ControlComboboxItemIndicator", () => {
        scopedIt("has data-slot=combobox-item-indicator", () => {
            const wrapper = mount(ControlComboboxItemIndicator);
            expect(wrapper.attributes("data-slot")).toBe("combobox-item-indicator");
        });

        scopedIt("applies ml-auto class", () => {
            const wrapper = mount(ControlComboboxItemIndicator);
            expect(wrapper.classes()).toContain("ml-auto");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlComboboxItemIndicator, { props: { class: "my-ind" } });
            expect(wrapper.classes()).toContain("my-ind");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlComboboxItemIndicator, {
                slots: { default: "<span>✓</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ControlComboboxList", () => {
        scopedIt("has data-slot=combobox-list", () => {
            const wrapper = mount(ControlComboboxList);
            expect(wrapper.find('[data-slot="combobox-list"]').exists()).toBe(true);
        });

        scopedIt("applies z-50 and rounded-md classes", () => {
            const wrapper = mount(ControlComboboxList);
            const el = wrapper.find('[data-slot="combobox-list"]');
            expect(el.classes()).toContain("z-50");
            expect(el.classes()).toContain("rounded-md");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlComboboxList, { props: { class: "my-list" } });
            expect(wrapper.find('[data-slot="combobox-list"]').classes()).toContain("my-list");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlComboboxList, { slots: { default: "<span>items</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ControlComboboxSeparator", () => {
        scopedIt("has data-slot=combobox-separator", () => {
            const wrapper = mount(ControlComboboxSeparator);
            expect(wrapper.attributes("data-slot")).toBe("combobox-separator");
        });

        scopedIt("applies bg-border and h-px classes", () => {
            const wrapper = mount(ControlComboboxSeparator);
            expect(wrapper.classes()).toContain("bg-border");
            expect(wrapper.classes()).toContain("h-px");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlComboboxSeparator, { props: { class: "my-sep" } });
            expect(wrapper.classes()).toContain("my-sep");
        });
    });

    describe("ControlComboboxTrigger", () => {
        scopedIt("has data-slot=combobox-trigger", () => {
            const wrapper = mount(ControlComboboxTrigger);
            expect(wrapper.attributes("data-slot")).toBe("combobox-trigger");
        });

        scopedIt("has tabindex=0", () => {
            const wrapper = mount(ControlComboboxTrigger);
            expect(wrapper.attributes("tabindex")).toBe("0");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlComboboxTrigger, {
                slots: { default: "<span>open</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlComboboxTrigger, { props: { class: "my-trigger" } });
            expect(wrapper.classes()).toContain("my-trigger");
        });
    });

    describe("ControlComboboxViewport", () => {
        scopedIt("has data-slot=combobox-viewport", () => {
            const wrapper = mount(ControlComboboxViewport);
            expect(wrapper.attributes("data-slot")).toBe("combobox-viewport");
        });

        scopedIt("applies max-h and overflow-y-auto classes", () => {
            const wrapper = mount(ControlComboboxViewport);
            expect(wrapper.classes()).toContain("max-h-[300px]");
            expect(wrapper.classes()).toContain("overflow-y-auto");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlComboboxViewport, { props: { class: "my-viewport" } });
            expect(wrapper.classes()).toContain("my-viewport");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlComboboxViewport, {
                slots: { default: "<span>items</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });
});
