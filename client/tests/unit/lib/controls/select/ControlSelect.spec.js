import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ControlSelect from "@vueda/controls/select/ControlSelect.vue";
import ControlSelectContent from "@vueda/controls/select/ControlSelectContent.vue";
import ControlSelectGroup from "@vueda/controls/select/ControlSelectGroup.vue";
import ControlSelectItem from "@vueda/controls/select/ControlSelectItem.vue";
import ControlSelectItemText from "@vueda/controls/select/ControlSelectItemText.vue";
import ControlSelectLabel from "@vueda/controls/select/ControlSelectLabel.vue";
import ControlSelectScrollDownButton from "@vueda/controls/select/ControlSelectScrollDownButton.vue";
import ControlSelectScrollUpButton from "@vueda/controls/select/ControlSelectScrollUpButton.vue";
import ControlSelectSeparator from "@vueda/controls/select/ControlSelectSeparator.vue";
import ControlSelectTrigger from "@vueda/controls/select/ControlSelectTrigger.vue";
import ControlSelectValue from "@vueda/controls/select/ControlSelectValue.vue";

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
        SelectRoot: defineComponent({
            name: "SelectRoot",
            setup(_, { slots, attrs }) {
                return () => h("div", attrs, slots.default ? slots.default({ modelValue: undefined }) : undefined);
            },
        }),
        SelectContent: makePassthrough("SelectContent"),
        SelectPortal: makePassthrough("SelectPortal"),
        SelectViewport: makePassthrough("SelectViewport"),
        SelectGroup: makePassthrough("SelectGroup"),
        SelectItem: makePassthrough("SelectItem"),
        SelectItemText: makePassthrough("SelectItemText"),
        SelectItemIndicator: makePassthrough("SelectItemIndicator"),
        SelectLabel: makePassthrough("SelectLabel"),
        SelectScrollDownButton: makePassthrough("SelectScrollDownButton"),
        SelectScrollUpButton: makePassthrough("SelectScrollUpButton"),
        SelectSeparator: makePassthrough("SelectSeparator"),
        SelectTrigger: makePassthrough("SelectTrigger", "button"),
        SelectIcon: makePassthrough("SelectIcon"),
        SelectValue: makePassthrough("SelectValue", "span"),
    };
});

describe("lib/controls/select/ControlSelect.vue", () => {
    describe("ControlSelect", () => {
        scopedIt("has data-slot=select", () => {
            const wrapper = mount(ControlSelect);
            expect(wrapper.find('[data-slot="select"]').exists()).toBe(true);
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlSelect, { slots: { default: "<span>trigger</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlSelect, { props: { class: "my-select" } });
            expect(wrapper.find('[data-slot="select"]').classes()).toContain("my-select");
        });
    });

    describe("ControlSelectContent", () => {
        scopedIt("has data-slot=select-content", () => {
            const wrapper = mount(ControlSelectContent);
            expect(wrapper.find('[data-slot="select-content"]').exists()).toBe(true);
        });

        scopedIt("applies popover background and z-50 classes", () => {
            const wrapper = mount(ControlSelectContent);
            const el = wrapper.find('[data-slot="select-content"]');
            expect(el.classes()).toContain("bg-popover");
            expect(el.classes()).toContain("z-50");
        });

        scopedIt("applies popper translate classes when position=popper (default)", () => {
            const wrapper = mount(ControlSelectContent);
            const el = wrapper.find('[data-slot="select-content"]');
            expect(el.classes().some((c) => c.includes("translate-y"))).toBe(true);
        });

        scopedIt("does not apply translate classes when position=item-aligned", () => {
            const wrapper = mount(ControlSelectContent, { props: { position: "item-aligned" } });
            const el = wrapper.find('[data-slot="select-content"]');
            expect(el.classes().some((c) => c.includes("translate-y"))).toBe(false);
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlSelectContent, { props: { class: "my-content" } });
            expect(wrapper.find('[data-slot="select-content"]').classes()).toContain("my-content");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlSelectContent, { slots: { default: "<span>items</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ControlSelectGroup", () => {
        scopedIt("has data-slot=select-group", () => {
            const wrapper = mount(ControlSelectGroup);
            expect(wrapper.attributes("data-slot")).toBe("select-group");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlSelectGroup, { slots: { default: "<span>item</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ControlSelectItem", () => {
        scopedIt("has data-slot=select-item", () => {
            const wrapper = mount(ControlSelectItem, { props: { value: "a" } });
            expect(wrapper.find('[data-slot="select-item"]').exists()).toBe(true);
        });

        scopedIt("applies rounded-sm and text-sm classes", () => {
            const wrapper = mount(ControlSelectItem, { props: { value: "a" } });
            const el = wrapper.find('[data-slot="select-item"]');
            expect(el.classes()).toContain("rounded-sm");
            expect(el.classes()).toContain("text-sm");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlSelectItem, {
                props: { value: "a", class: "my-item" },
            });
            expect(wrapper.find('[data-slot="select-item"]').classes()).toContain("my-item");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlSelectItem, {
                props: { value: "a" },
                slots: { default: "<span>label</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ControlSelectItemText", () => {
        scopedIt("has data-slot=select-item-text", () => {
            const wrapper = mount(ControlSelectItemText);
            expect(wrapper.attributes("data-slot")).toBe("select-item-text");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlSelectItemText, { slots: { default: "Option A" } });
            expect(wrapper.text()).toBe("Option A");
        });
    });

    describe("ControlSelectLabel", () => {
        scopedIt("has data-slot=select-label", () => {
            const wrapper = mount(ControlSelectLabel);
            expect(wrapper.attributes("data-slot")).toBe("select-label");
        });

        scopedIt("applies muted text and text-xs classes", () => {
            const wrapper = mount(ControlSelectLabel);
            expect(wrapper.classes()).toContain("text-muted-foreground");
            expect(wrapper.classes()).toContain("text-xs");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlSelectLabel, { props: { class: "my-label" } });
            expect(wrapper.classes()).toContain("my-label");
        });
    });

    describe("ControlSelectScrollDownButton", () => {
        scopedIt("has data-slot=select-scroll-down-button", () => {
            const wrapper = mount(ControlSelectScrollDownButton);
            expect(wrapper.attributes("data-slot")).toBe("select-scroll-down-button");
        });

        scopedIt("applies flex and cursor-default classes", () => {
            const wrapper = mount(ControlSelectScrollDownButton);
            expect(wrapper.classes()).toContain("flex");
            expect(wrapper.classes()).toContain("cursor-default");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlSelectScrollDownButton, { props: { class: "my-down" } });
            expect(wrapper.classes()).toContain("my-down");
        });

        scopedIt("renders custom slot content", () => {
            const wrapper = mount(ControlSelectScrollDownButton, {
                slots: { default: "<span>v</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ControlSelectScrollUpButton", () => {
        scopedIt("has data-slot=select-scroll-up-button", () => {
            const wrapper = mount(ControlSelectScrollUpButton);
            expect(wrapper.attributes("data-slot")).toBe("select-scroll-up-button");
        });

        scopedIt("applies flex and cursor-default classes", () => {
            const wrapper = mount(ControlSelectScrollUpButton);
            expect(wrapper.classes()).toContain("flex");
            expect(wrapper.classes()).toContain("cursor-default");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlSelectScrollUpButton, { props: { class: "my-up" } });
            expect(wrapper.classes()).toContain("my-up");
        });
    });

    describe("ControlSelectSeparator", () => {
        scopedIt("has data-slot=select-separator", () => {
            const wrapper = mount(ControlSelectSeparator);
            expect(wrapper.attributes("data-slot")).toBe("select-separator");
        });

        scopedIt("applies bg-border and h-px classes", () => {
            const wrapper = mount(ControlSelectSeparator);
            expect(wrapper.classes()).toContain("bg-border");
            expect(wrapper.classes()).toContain("h-px");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlSelectSeparator, { props: { class: "my-sep" } });
            expect(wrapper.classes()).toContain("my-sep");
        });
    });

    describe("ControlSelectTrigger", () => {
        scopedIt("has data-slot=select-trigger", () => {
            const wrapper = mount(ControlSelectTrigger);
            expect(wrapper.find('[data-slot="select-trigger"]').exists()).toBe(true);
        });

        scopedIt("applies border-input and rounded-md classes", () => {
            const wrapper = mount(ControlSelectTrigger);
            const el = wrapper.find('[data-slot="select-trigger"]');
            expect(el.classes()).toContain("border-input");
            expect(el.classes()).toContain("rounded-md");
        });

        scopedIt("has data-size=default by default", () => {
            const wrapper = mount(ControlSelectTrigger);
            expect(wrapper.find('[data-slot="select-trigger"]').attributes("data-size")).toBe("default");
        });

        scopedIt("has data-size=sm when size=sm", () => {
            const wrapper = mount(ControlSelectTrigger, { props: { size: "sm" } });
            expect(wrapper.find('[data-slot="select-trigger"]').attributes("data-size")).toBe("sm");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlSelectTrigger, { props: { class: "my-trigger" } });
            expect(wrapper.find('[data-slot="select-trigger"]').classes()).toContain("my-trigger");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlSelectTrigger, {
                slots: { default: "<span>value</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ControlSelectValue", () => {
        scopedIt("has data-slot=select-value", () => {
            const wrapper = mount(ControlSelectValue);
            expect(wrapper.attributes("data-slot")).toBe("select-value");
        });

        scopedIt("passes placeholder prop", () => {
            const wrapper = mount(ControlSelectValue, { props: { placeholder: "Pick one..." } });
            expect(wrapper.attributes("placeholder")).toBe("Pick one...");
        });
    });
});
