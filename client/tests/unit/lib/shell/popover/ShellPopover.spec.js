import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ShellPopover from "@vueda/shell/popover/ShellPopover.vue";
import ShellPopoverAnchor from "@vueda/shell/popover/ShellPopoverAnchor.vue";
import ShellPopoverContent from "@vueda/shell/popover/ShellPopoverContent.vue";
import ShellPopoverTrigger from "@vueda/shell/popover/ShellPopoverTrigger.vue";

// Stub portal and context-requiring primitives as passthrough divs.
// PopoverRoot and PopoverContent require PopoverRoot context; PopoverPortal teleports
// content out of the component tree. Stubbing keeps tests as unit tests focused on
// our wrappers' own contributions (data-slot, classes).
vi.mock("reka-ui", async (importOriginal) => {
    const actual = await importOriginal();
    const { defineComponent, h } = await import("vue");
    const makePassthrough = (name) =>
        defineComponent({
            name,
            setup(_, { slots, attrs }) {
                return () => h("div", attrs, slots.default ? slots.default({}) : undefined);
            },
        });
    return {
        ...actual,
        PopoverRoot: makePassthrough("PopoverRoot"),
        PopoverPortal: makePassthrough("PopoverPortal"),
        PopoverContent: makePassthrough("PopoverContent"),
        PopoverTrigger: makePassthrough("PopoverTrigger"),
        PopoverAnchor: makePassthrough("PopoverAnchor"),
    };
});

const mountPopover = (contentProps = {}) =>
    mount({
        components: { ShellPopover, ShellPopoverContent },
        setup() {
            return { contentProps };
        },
        template: `
            <ShellPopover :open="true">
                <ShellPopoverContent v-bind="contentProps">Popover body</ShellPopoverContent>
            </ShellPopover>
        `,
    });

describe("lib/shell/popover/ShellPopover.vue", () => {
    describe("ShellPopover", () => {
        scopedIt("has data-slot=popover", () => {
            const wrapper = mountPopover();
            expect(wrapper.find('[data-slot="popover"]').exists()).toBe(true);
        });

        scopedIt("renders slot content", () => {
            const wrapper = mountPopover();
            expect(wrapper.find('[data-slot="popover-content"]').text()).toContain("Popover body");
        });
    });

    describe("ShellPopoverContent", () => {
        scopedIt("has data-slot=popover-content", () => {
            const wrapper = mountPopover();
            expect(wrapper.find('[data-slot="popover-content"]').exists()).toBe(true);
        });

        scopedIt("applies base styling classes", () => {
            const wrapper = mountPopover();
            const content = wrapper.find('[data-slot="popover-content"]');
            expect(content.classes()).toContain("z-50");
            expect(content.classes()).toContain("rounded-md");
            expect(content.classes()).toContain("border");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mountPopover({ class: "my-popover" });
            expect(wrapper.find('[data-slot="popover-content"]').classes()).toContain("my-popover");
        });
    });

    describe("ShellPopoverTrigger", () => {
        scopedIt("has data-slot=popover-trigger", () => {
            const wrapper = mount(ShellPopoverTrigger);
            expect(wrapper.attributes("data-slot")).toBe("popover-trigger");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(ShellPopoverTrigger, {
                slots: { default: "<span>Open</span>" },
            });
            expect(wrapper.text()).toBe("Open");
        });
    });

    describe("ShellPopoverAnchor", () => {
        scopedIt("has data-slot=popover-anchor", () => {
            const wrapper = mount(ShellPopoverAnchor);
            expect(wrapper.attributes("data-slot")).toBe("popover-anchor");
        });
    });
});
