import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Combobox from "@vueda/controls/combobox/Combobox.vue";
import ComboboxAnchor from "@vueda/controls/combobox/ComboboxAnchor.vue";
import ComboboxEmpty from "@vueda/controls/combobox/ComboboxEmpty.vue";
import ComboboxGroup from "@vueda/controls/combobox/ComboboxGroup.vue";
import ComboboxInput from "@vueda/controls/combobox/ComboboxInput.vue";
import ComboboxItem from "@vueda/controls/combobox/ComboboxItem.vue";
import ComboboxItemIndicator from "@vueda/controls/combobox/ComboboxItemIndicator.vue";
import ComboboxList from "@vueda/controls/combobox/ComboboxList.vue";
import ComboboxSeparator from "@vueda/controls/combobox/ComboboxSeparator.vue";
import ComboboxTrigger from "@vueda/controls/combobox/ComboboxTrigger.vue";
import ComboboxViewport from "@vueda/controls/combobox/ComboboxViewport.vue";

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

describe("lib/controls/combobox/Combobox.vue", () => {
    describe("Combobox", () => {
        scopedIt("has data-slot=combobox", () => {
            const wrapper = mount(Combobox);
            expect(wrapper.find('[data-slot="combobox"]').exists()).toBe(true);
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(Combobox, { slots: { default: "<span>content</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(Combobox, { props: { class: "my-combo" } });
            expect(wrapper.find('[data-slot="combobox"]').classes()).toContain("my-combo");
        });
    });

    describe("ComboboxAnchor", () => {
        scopedIt("has data-slot=combobox-anchor", () => {
            const wrapper = mount(ComboboxAnchor);
            expect(wrapper.attributes("data-slot")).toBe("combobox-anchor");
        });

        scopedIt("applies w-[200px] class", () => {
            const wrapper = mount(ComboboxAnchor);
            expect(wrapper.classes()).toContain("w-[200px]");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ComboboxAnchor, { props: { class: "w-full" } });
            expect(wrapper.classes()).toContain("w-full");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ComboboxAnchor, { slots: { default: "<span>x</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ComboboxEmpty", () => {
        scopedIt("has data-slot=combobox-empty", () => {
            const wrapper = mount(ComboboxEmpty);
            expect(wrapper.attributes("data-slot")).toBe("combobox-empty");
        });

        scopedIt("applies py-6 and text-center classes", () => {
            const wrapper = mount(ComboboxEmpty);
            expect(wrapper.classes()).toContain("py-6");
            expect(wrapper.classes()).toContain("text-center");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ComboboxEmpty, { props: { class: "my-empty" } });
            expect(wrapper.classes()).toContain("my-empty");
        });
    });

    describe("ComboboxGroup", () => {
        scopedIt("has data-slot=combobox-group", () => {
            const wrapper = mount(ComboboxGroup);
            expect(wrapper.attributes("data-slot")).toBe("combobox-group");
        });

        scopedIt("applies overflow-hidden and p-1 classes", () => {
            const wrapper = mount(ComboboxGroup);
            expect(wrapper.classes()).toContain("overflow-hidden");
            expect(wrapper.classes()).toContain("p-1");
        });

        scopedIt("renders heading when provided", () => {
            const wrapper = mount(ComboboxGroup, { props: { heading: "Fruits" } });
            expect(wrapper.text()).toContain("Fruits");
        });

        scopedIt("does not render heading element when not provided", () => {
            const wrapper = mount(ComboboxGroup);
            expect(wrapper.find("span").exists()).toBe(false);
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ComboboxGroup, { slots: { default: "<div>item</div>" } });
            expect(wrapper.find("div > div").exists()).toBe(true);
        });
    });

    describe("ComboboxInput", () => {
        scopedIt("has data-slot=combobox-input-wrapper outer div", () => {
            const wrapper = mount(ComboboxInput);
            expect(wrapper.find('[data-slot="combobox-input-wrapper"]').exists()).toBe(true);
        });

        scopedIt("has data-slot=combobox-input on the input", () => {
            const wrapper = mount(ComboboxInput);
            expect(wrapper.find('[data-slot="combobox-input"]').exists()).toBe(true);
        });

        scopedIt("applies h-9 and border-b to wrapper", () => {
            const wrapper = mount(ComboboxInput);
            const wrapperEl = wrapper.find('[data-slot="combobox-input-wrapper"]');
            expect(wrapperEl.classes()).toContain("h-9");
            expect(wrapperEl.classes()).toContain("border-b");
        });

        scopedIt("merges custom class on input", () => {
            const wrapper = mount(ComboboxInput, { props: { class: "my-input" } });
            expect(wrapper.find('[data-slot="combobox-input"]').classes()).toContain("my-input");
        });
    });

    describe("ComboboxItem", () => {
        scopedIt("has data-slot=combobox-item", () => {
            const wrapper = mount(ComboboxItem, { props: { value: "x" } });
            expect(wrapper.attributes("data-slot")).toBe("combobox-item");
        });

        scopedIt("applies rounded-sm and text-sm classes", () => {
            const wrapper = mount(ComboboxItem, { props: { value: "x" } });
            expect(wrapper.classes()).toContain("rounded-sm");
            expect(wrapper.classes()).toContain("text-sm");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ComboboxItem, {
                props: { value: "x", class: "my-item" },
            });
            expect(wrapper.classes()).toContain("my-item");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ComboboxItem, {
                props: { value: "x" },
                slots: { default: "<span>label</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ComboboxItemIndicator", () => {
        scopedIt("has data-slot=combobox-item-indicator", () => {
            const wrapper = mount(ComboboxItemIndicator);
            expect(wrapper.attributes("data-slot")).toBe("combobox-item-indicator");
        });

        scopedIt("applies ml-auto class", () => {
            const wrapper = mount(ComboboxItemIndicator);
            expect(wrapper.classes()).toContain("ml-auto");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ComboboxItemIndicator, { props: { class: "my-ind" } });
            expect(wrapper.classes()).toContain("my-ind");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ComboboxItemIndicator, {
                slots: { default: "<span>✓</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ComboboxList", () => {
        scopedIt("has data-slot=combobox-list", () => {
            const wrapper = mount(ComboboxList);
            expect(wrapper.find('[data-slot="combobox-list"]').exists()).toBe(true);
        });

        scopedIt("applies z-50 and rounded-vueda-control classes", () => {
            const wrapper = mount(ComboboxList);
            const el = wrapper.find('[data-slot="combobox-list"]');
            expect(el.classes()).toContain("z-50");
            expect(el.classes()).toContain("rounded-vueda-control");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ComboboxList, { props: { class: "my-list" } });
            expect(wrapper.find('[data-slot="combobox-list"]').classes()).toContain("my-list");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ComboboxList, { slots: { default: "<span>items</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ComboboxSeparator", () => {
        scopedIt("has data-slot=combobox-separator", () => {
            const wrapper = mount(ComboboxSeparator);
            expect(wrapper.attributes("data-slot")).toBe("combobox-separator");
        });

        scopedIt("applies bg-border and h-px classes", () => {
            const wrapper = mount(ComboboxSeparator);
            expect(wrapper.classes()).toContain("bg-border");
            expect(wrapper.classes()).toContain("h-px");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ComboboxSeparator, { props: { class: "my-sep" } });
            expect(wrapper.classes()).toContain("my-sep");
        });
    });

    describe("ComboboxTrigger", () => {
        scopedIt("has data-slot=combobox-trigger", () => {
            const wrapper = mount(ComboboxTrigger);
            expect(wrapper.attributes("data-slot")).toBe("combobox-trigger");
        });

        scopedIt("has tabindex=0", () => {
            const wrapper = mount(ComboboxTrigger);
            expect(wrapper.attributes("tabindex")).toBe("0");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ComboboxTrigger, {
                slots: { default: "<span>open</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ComboboxTrigger, { props: { class: "my-trigger" } });
            expect(wrapper.classes()).toContain("my-trigger");
        });
    });

    describe("ComboboxViewport", () => {
        scopedIt("has data-slot=combobox-viewport", () => {
            const wrapper = mount(ComboboxViewport);
            expect(wrapper.attributes("data-slot")).toBe("combobox-viewport");
        });

        scopedIt("applies max-h and overflow-y-auto classes", () => {
            const wrapper = mount(ComboboxViewport);
            expect(wrapper.classes()).toContain("max-h-[300px]");
            expect(wrapper.classes()).toContain("overflow-y-auto");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ComboboxViewport, { props: { class: "my-viewport" } });
            expect(wrapper.classes()).toContain("my-viewport");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ComboboxViewport, {
                slots: { default: "<span>items</span>" },
            });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });
});
