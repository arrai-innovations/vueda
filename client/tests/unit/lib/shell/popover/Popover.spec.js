import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Popover from "@vueda/shell/popover/Popover.vue";
import PopoverAnchor from "@vueda/shell/popover/PopoverAnchor.vue";
import PopoverContent from "@vueda/shell/popover/PopoverContent.vue";
import PopoverTrigger from "@vueda/shell/popover/PopoverTrigger.vue";

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
        components: { Popover, PopoverContent },
        setup() {
            return { contentProps };
        },
        template: `
            <Popover :open="true">
                <PopoverContent v-bind="contentProps">Popover body</PopoverContent>
            </Popover>
        `,
    });

describe("lib/shell/popover/Popover.vue", () => {
    describe("Popover", () => {
        scopedIt("has data-slot=popover", () => {
            const wrapper = mountPopover();
            expect(wrapper.find('[data-slot="popover"]').exists()).toBe(true);
        });

        scopedIt("renders slot content", () => {
            const wrapper = mountPopover();
            expect(wrapper.find('[data-slot="popover-content"]').text()).toContain("Popover body");
        });
    });

    describe("PopoverContent", () => {
        scopedIt("has data-slot=popover-content", () => {
            const wrapper = mountPopover();
            expect(wrapper.find('[data-slot="popover-content"]').exists()).toBe(true);
        });

        scopedIt("applies base styling classes", () => {
            const wrapper = mountPopover();
            const content = wrapper.find('[data-slot="popover-content"]');
            expect(content.classes()).toContain("z-50");
            expect(content.classes()).toContain("rounded-vueda-control");
            expect(content.classes()).toContain("overlay-hairline");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mountPopover({ class: "my-popover" });
            expect(wrapper.find('[data-slot="popover-content"]').classes()).toContain("my-popover");
        });
    });

    describe("PopoverTrigger", () => {
        scopedIt("has data-slot=popover-trigger", () => {
            const wrapper = mount(PopoverTrigger);
            expect(wrapper.attributes("data-slot")).toBe("popover-trigger");
        });

        scopedIt("renders slot content", () => {
            const wrapper = mount(PopoverTrigger, {
                slots: { default: "<span>Open</span>" },
            });
            expect(wrapper.text()).toBe("Open");
        });
    });

    describe("PopoverAnchor", () => {
        scopedIt("has data-slot=popover-anchor", () => {
            const wrapper = mount(PopoverAnchor);
            expect(wrapper.attributes("data-slot")).toBe("popover-anchor");
        });
    });
});
