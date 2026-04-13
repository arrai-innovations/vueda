import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Tooltip from "@vueda/shell/tooltip/Tooltip.vue";
import TooltipContent from "@vueda/shell/tooltip/TooltipContent.vue";
import TooltipProvider from "@vueda/shell/tooltip/TooltipProvider.vue";
import TooltipTrigger from "@vueda/shell/tooltip/TooltipTrigger.vue";

// Stub portal and context-requiring Reka UI primitives as passthrough divs.
// TooltipRoot/TooltipContent require TooltipProvider context; TooltipPortal teleports
// content outside the tree. TooltipArrow requires a positioned parent.
// Stubbing them keeps tests focused on our wrappers' own contributions.
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
        TooltipProvider: makePassthrough("TooltipProvider"),
        TooltipRoot: makePassthrough("TooltipRoot"),
        TooltipPortal: makePassthrough("TooltipPortal"),
        TooltipContent: makePassthrough("TooltipContent"),
        TooltipTrigger: makePassthrough("TooltipTrigger"),
        TooltipArrow: makePassthrough("TooltipArrow"),
    };
});

const mountTooltip = (contentProps = {}) =>
    mount({
        components: { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent },
        setup() {
            return { contentProps };
        },
        template: `
            <TooltipProvider>
                <Tooltip :open="true">
                    <TooltipTrigger>Hover me</TooltipTrigger>
                    <TooltipContent v-bind="contentProps">Tooltip text</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        `,
    });

describe("lib/shell/tooltip/Tooltip.vue", () => {
    describe("TooltipProvider", () => {
        scopedIt("renders slot content", () => {
            const wrapper = mount(TooltipProvider, {
                slots: { default: "<span>child</span>" },
            });
            expect(wrapper.text()).toBe("child");
        });
    });

    describe("Tooltip", () => {
        scopedIt("has data-slot=tooltip", () => {
            const wrapper = mountTooltip();
            expect(wrapper.find('[data-slot="tooltip"]').exists()).toBe(true);
        });

        scopedIt("renders slot content", () => {
            const wrapper = mountTooltip();
            expect(wrapper.find('[data-slot="tooltip-content"]').text()).toContain("Tooltip text");
        });
    });

    describe("TooltipContent", () => {
        scopedIt("has data-slot=tooltip-content", () => {
            const wrapper = mountTooltip();
            expect(wrapper.find('[data-slot="tooltip-content"]').exists()).toBe(true);
        });

        scopedIt("applies base styling classes", () => {
            const wrapper = mountTooltip();
            const content = wrapper.find('[data-slot="tooltip-content"]');
            expect(content.classes()).toContain("z-50");
            expect(content.classes()).toContain("rounded-md");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mountTooltip({ class: "my-tooltip" });
            expect(wrapper.find('[data-slot="tooltip-content"]').classes()).toContain("my-tooltip");
        });
    });

    describe("TooltipTrigger", () => {
        scopedIt("has data-slot=tooltip-trigger", () => {
            const wrapper = mountTooltip();
            expect(wrapper.find('[data-slot="tooltip-trigger"]').exists()).toBe(true);
        });

        scopedIt("renders slot content", () => {
            const wrapper = mountTooltip();
            expect(wrapper.find('[data-slot="tooltip-trigger"]').text()).toBe("Hover me");
        });
    });
});
