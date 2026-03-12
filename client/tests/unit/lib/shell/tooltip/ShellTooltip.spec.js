import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ShellTooltip from "@vueda/shell/tooltip/ShellTooltip.vue";
import ShellTooltipContent from "@vueda/shell/tooltip/ShellTooltipContent.vue";
import ShellTooltipProvider from "@vueda/shell/tooltip/ShellTooltipProvider.vue";
import ShellTooltipTrigger from "@vueda/shell/tooltip/ShellTooltipTrigger.vue";

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
        components: { ShellTooltipProvider, ShellTooltip, ShellTooltipTrigger, ShellTooltipContent },
        setup() {
            return { contentProps };
        },
        template: `
            <ShellTooltipProvider>
                <ShellTooltip :open="true">
                    <ShellTooltipTrigger>Hover me</ShellTooltipTrigger>
                    <ShellTooltipContent v-bind="contentProps">Tooltip text</ShellTooltipContent>
                </ShellTooltip>
            </ShellTooltipProvider>
        `,
    });

describe("lib/shell/tooltip/ShellTooltip.vue", () => {
    describe("ShellTooltipProvider", () => {
        scopedIt("renders slot content", () => {
            const wrapper = mount(ShellTooltipProvider, {
                slots: { default: "<span>child</span>" },
            });
            expect(wrapper.text()).toBe("child");
        });
    });

    describe("ShellTooltip", () => {
        scopedIt("has data-slot=tooltip", () => {
            const wrapper = mountTooltip();
            expect(wrapper.find('[data-slot="tooltip"]').exists()).toBe(true);
        });

        scopedIt("renders slot content", () => {
            const wrapper = mountTooltip();
            expect(wrapper.find('[data-slot="tooltip-content"]').text()).toContain("Tooltip text");
        });
    });

    describe("ShellTooltipContent", () => {
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

    describe("ShellTooltipTrigger", () => {
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
