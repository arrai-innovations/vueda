import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Select from "@vueda/controls/select/Select.vue";
import SelectContent from "@vueda/controls/select/SelectContent.vue";
import SelectGroup from "@vueda/controls/select/SelectGroup.vue";
import SelectItem from "@vueda/controls/select/SelectItem.vue";
import SelectItemText from "@vueda/controls/select/SelectItemText.vue";
import SelectLabel from "@vueda/controls/select/SelectLabel.vue";
import SelectScrollDownButton from "@vueda/controls/select/SelectScrollDownButton.vue";
import SelectScrollUpButton from "@vueda/controls/select/SelectScrollUpButton.vue";
import SelectSeparator from "@vueda/controls/select/SelectSeparator.vue";
import SelectTrigger from "@vueda/controls/select/SelectTrigger.vue";
import SelectValue from "@vueda/controls/select/SelectValue.vue";

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

describe("lib/controls/select/Select.vue", () => {
    describe("Select", () => {
        scopedIt("has data-slot=select", () => {
            const wrapper = mount(Select);
            expect(wrapper.find('[data-slot="select"]').exists()).toBe(true);
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(Select, { slots: { default: "<span>trigger</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(Select, { props: { class: "my-select" } });
            expect(wrapper.find('[data-slot="select"]').classes()).toContain("my-select");
        });
    });

    describe("SelectContent", () => {
        scopedIt("has data-slot=select-content", () => {
            const wrapper = mount(SelectContent);
            expect(wrapper.find('[data-slot="select-content"]').exists()).toBe(true);
        });

        scopedIt("applies popover background and z-50 classes", () => {
            const wrapper = mount(SelectContent);
            const el = wrapper.find('[data-slot="select-content"]');
            expect(el.classes()).toContain("bg-popover");
            expect(el.classes()).toContain("z-50");
        });

        scopedIt("applies popper translate classes when position=popper (default)", () => {
            const wrapper = mount(SelectContent);
            const el = wrapper.find('[data-slot="select-content"]');
            expect(el.classes().some((c) => c.includes("translate-y"))).toBe(true);
        });

        scopedIt("does not apply translate classes when position=item-aligned", () => {
            const wrapper = mount(SelectContent, { props: { position: "item-aligned" } });
            const el = wrapper.find('[data-slot="select-content"]');
            expect(el.classes().some((c) => c.includes("translate-y"))).toBe(false);
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(SelectContent, { props: { class: "my-content" } });
            expect(wrapper.find('[data-slot="select-content"]').classes()).toContain("my-content");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(SelectContent, { slots: { default: "<span>items</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("SelectGroup", () => {
        scopedIt("has data-slot=select-group", () => {
            const wrapper = mount(SelectGroup);
            expect(wrapper.attributes("data-slot")).toBe("select-group");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(SelectGroup, { slots: { default: "<span>item</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("SelectItem", () => {
        scopedIt("has data-slot=select-item", () => {
            const wrapper = mount(SelectItem, { props: { value: "a" } });
            expect(wrapper.find('[data-slot="select-item"]').exists()).toBe(true);
        });

        scopedIt("applies rounded-sm and text-sm classes", () => {
            const wrapper = mount(SelectItem, { props: { value: "a" } });
            const el = wrapper.find('[data-slot="select-item"]');
            expect(el.classes()).toContain("rounded-sm");
            expect(el.classes()).toContain("text-sm");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(SelectItem, {
                props: { value: "a", class: "my-item" },
            });
            expect(wrapper.find('[data-slot="select-item"]').classes()).toContain("my-item");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(SelectItem, {
                props: { value: "a" },
                slots: { default: "<span>label</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("SelectItemText", () => {
        scopedIt("has data-slot=select-item-text", () => {
            const wrapper = mount(SelectItemText);
            expect(wrapper.attributes("data-slot")).toBe("select-item-text");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(SelectItemText, { slots: { default: "Option A" } });
            expect(wrapper.text()).toBe("Option A");
        });
    });

    describe("SelectLabel", () => {
        scopedIt("has data-slot=select-label", () => {
            const wrapper = mount(SelectLabel);
            expect(wrapper.attributes("data-slot")).toBe("select-label");
        });

        scopedIt("applies micro-eyebrow typography (sans 11px 600 uppercase 0.04em)", () => {
            const wrapper = mount(SelectLabel);
            expect(wrapper.classes()).toContain("text-muted-foreground");
            expect(wrapper.classes()).toContain("text-[length:var(--vueda-text-micro)]");
            expect(wrapper.classes()).toContain("font-semibold");
            expect(wrapper.classes()).toContain("uppercase");
            expect(wrapper.classes()).toContain("tracking-[0.04em]");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(SelectLabel, { props: { class: "my-label" } });
            expect(wrapper.classes()).toContain("my-label");
        });
    });

    describe("SelectScrollDownButton", () => {
        scopedIt("has data-slot=select-scroll-down-button", () => {
            const wrapper = mount(SelectScrollDownButton);
            expect(wrapper.attributes("data-slot")).toBe("select-scroll-down-button");
        });

        scopedIt("applies flex and cursor-default classes", () => {
            const wrapper = mount(SelectScrollDownButton);
            expect(wrapper.classes()).toContain("flex");
            expect(wrapper.classes()).toContain("cursor-default");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(SelectScrollDownButton, { props: { class: "my-down" } });
            expect(wrapper.classes()).toContain("my-down");
        });

        scopedIt("renders custom slot content", () => {
            const wrapper = mount(SelectScrollDownButton, {
                slots: { default: "<span>v</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("SelectScrollUpButton", () => {
        scopedIt("has data-slot=select-scroll-up-button", () => {
            const wrapper = mount(SelectScrollUpButton);
            expect(wrapper.attributes("data-slot")).toBe("select-scroll-up-button");
        });

        scopedIt("applies flex and cursor-default classes", () => {
            const wrapper = mount(SelectScrollUpButton);
            expect(wrapper.classes()).toContain("flex");
            expect(wrapper.classes()).toContain("cursor-default");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(SelectScrollUpButton, { props: { class: "my-up" } });
            expect(wrapper.classes()).toContain("my-up");
        });
    });

    describe("SelectSeparator", () => {
        scopedIt("has data-slot=select-separator", () => {
            const wrapper = mount(SelectSeparator);
            expect(wrapper.attributes("data-slot")).toBe("select-separator");
        });

        scopedIt("applies bg-border and h-hairline classes", () => {
            const wrapper = mount(SelectSeparator);
            expect(wrapper.classes()).toContain("bg-border");
            expect(wrapper.classes()).toContain("h-hairline");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(SelectSeparator, { props: { class: "my-sep" } });
            expect(wrapper.classes()).toContain("my-sep");
        });
    });

    describe("SelectTrigger", () => {
        scopedIt("has data-slot=select-trigger", () => {
            const wrapper = mount(SelectTrigger);
            expect(wrapper.find('[data-slot="select-trigger"]').exists()).toBe(true);
        });

        scopedIt("applies field-line and rounded-vueda-field classes", () => {
            const wrapper = mount(SelectTrigger);
            const el = wrapper.find('[data-slot="select-trigger"]');
            expect(el.classes()).toContain("field-line");
            expect(el.classes()).toContain("rounded-vueda-field");
        });

        scopedIt("has data-size=default by default", () => {
            const wrapper = mount(SelectTrigger);
            expect(wrapper.find('[data-slot="select-trigger"]').attributes("data-size")).toBe("default");
        });

        scopedIt("has data-size=sm when size=sm", () => {
            const wrapper = mount(SelectTrigger, { props: { size: "sm" } });
            expect(wrapper.find('[data-slot="select-trigger"]').attributes("data-size")).toBe("sm");
        });

        scopedIt("has data-size=lg when size=lg", () => {
            const wrapper = mount(SelectTrigger, { props: { size: "lg" } });
            expect(wrapper.find('[data-slot="select-trigger"]').attributes("data-size")).toBe("lg");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(SelectTrigger, { props: { class: "my-trigger" } });
            expect(wrapper.find('[data-slot="select-trigger"]').classes()).toContain("my-trigger");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(SelectTrigger, {
                slots: { default: "<span>value</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("SelectValue", () => {
        scopedIt("has data-slot=select-value", () => {
            const wrapper = mount(SelectValue);
            expect(wrapper.attributes("data-slot")).toBe("select-value");
        });

        scopedIt("passes placeholder prop", () => {
            const wrapper = mount(SelectValue, { props: { placeholder: "Pick one..." } });
            expect(wrapper.attributes("placeholder")).toBe("Pick one...");
        });
    });
});
