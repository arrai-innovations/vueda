import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ControlPopover from "@vueda/controls/popover/ControlPopover.vue";
import ControlPopoverAnchor from "@vueda/controls/popover/ControlPopoverAnchor.vue";
import ControlPopoverContent from "@vueda/controls/popover/ControlPopoverContent.vue";
import ControlPopoverTrigger from "@vueda/controls/popover/ControlPopoverTrigger.vue";

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
        PopoverRoot: defineComponent({
            name: "PopoverRoot",
            setup(_, { slots, attrs }) {
                return () => h("div", attrs, slots.default ? slots.default({}) : undefined);
            },
        }),
        PopoverTrigger: makePassthrough("PopoverTrigger", "button"),
        PopoverAnchor: makePassthrough("PopoverAnchor"),
        PopoverPortal: makePassthrough("PopoverPortal"),
        PopoverContent: makePassthrough("PopoverContent"),
    };
});

describe("lib/controls/popover/ControlPopover.vue", () => {
    describe("ControlPopover", () => {
        scopedIt("has data-slot=popover on the root element", () => {
            const wrapper = mount(ControlPopover);
            expect(wrapper.find('[data-slot="popover"]').exists()).toBe(true);
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlPopover, { slots: { default: "<span>content</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ControlPopoverTrigger", () => {
        scopedIt("has data-slot=popover-trigger", () => {
            const wrapper = mount(ControlPopoverTrigger);
            expect(wrapper.find('[data-slot="popover-trigger"]').exists()).toBe(true);
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlPopoverTrigger, { slots: { default: "Open" } });
            expect(wrapper.text()).toBe("Open");
        });
    });

    describe("ControlPopoverAnchor", () => {
        scopedIt("has data-slot=popover-anchor", () => {
            const wrapper = mount(ControlPopoverAnchor);
            expect(wrapper.find('[data-slot="popover-anchor"]').exists()).toBe(true);
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlPopoverAnchor, { slots: { default: "<span>anchor</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });
    });

    describe("ControlPopoverContent", () => {
        scopedIt("has data-slot=popover-content", () => {
            const wrapper = mount(ControlPopoverContent);
            expect(wrapper.find('[data-slot="popover-content"]').exists()).toBe(true);
        });

        scopedIt("applies bg-popover and z-50 classes", () => {
            const wrapper = mount(ControlPopoverContent);
            const el = wrapper.find('[data-slot="popover-content"]');
            expect(el.classes()).toContain("bg-popover");
            expect(el.classes()).toContain("z-50");
        });

        scopedIt("applies border and shadow classes", () => {
            const wrapper = mount(ControlPopoverContent);
            const el = wrapper.find('[data-slot="popover-content"]');
            expect(el.classes()).toContain("rounded-md");
            expect(el.classes()).toContain("border");
            expect(el.classes()).toContain("shadow-md");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(ControlPopoverContent, { props: { class: "my-popover" } });
            expect(wrapper.find('[data-slot="popover-content"]').classes()).toContain("my-popover");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ControlPopoverContent, { slots: { default: "<span>panel</span>" } });
            expect(wrapper.find("span").exists()).toBe(true);
        });

        scopedIt("applies w-72 and p-4 sizing classes", () => {
            const wrapper = mount(ControlPopoverContent);
            const el = wrapper.find('[data-slot="popover-content"]');
            expect(el.classes()).toContain("w-72");
            expect(el.classes()).toContain("p-4");
        });
    });
});
