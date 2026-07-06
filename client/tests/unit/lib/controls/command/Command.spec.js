import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Command from "@vueda/controls/command/Command.vue";
import CommandFooter from "@vueda/controls/command/CommandFooter.vue";
import CommandGroup from "@vueda/controls/command/CommandGroup.vue";
import { defineComponent, h } from "vue";

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
        ListboxRoot: makePassthrough("ListboxRoot"),
        ListboxGroup: makePassthrough("ListboxGroup"),
        ListboxGroupLabel: makePassthrough("ListboxGroupLabel"),
        useFilter: () => ({ contains: () => true }),
        useId: () => "id",
    };
});

describe("lib/controls/command/Command.vue", () => {
    describe("Command", () => {
        scopedIt("uses card radius (shell, not slab)", () => {
            const wrapper = mount(Command);
            const el = wrapper.find('[data-slot="command"]');
            expect(el.classes()).toContain("rounded-vueda-card");
            expect(el.classes()).not.toContain("rounded-md");
        });
    });

    describe("CommandGroup heading", () => {
        scopedIt("applies micro-eyebrow typography (sans 11px 600 uppercase 0.04em)", () => {
            const Host = defineComponent({
                components: { Command, CommandGroup },
                setup() {
                    return () => h(Command, null, () => [h(CommandGroup, { heading: "Suggestions" })]);
                },
            });
            const wrapper = mount(Host);
            const heading = wrapper.find('[data-slot="command-group-heading"]');
            expect(heading.exists()).toBe(true);
            const cls = heading.classes();
            expect(cls).toContain("text-[length:var(--vueda-text-micro)]");
            expect(cls).toContain("font-semibold");
            expect(cls).toContain("uppercase");
            expect(cls).toContain("tracking-[0.04em]");
            expect(cls).toContain("text-muted-foreground");
        });
    });

    describe("CommandFooter", () => {
        scopedIt("has data-slot=command-footer", () => {
            const wrapper = mount(CommandFooter);
            expect(wrapper.find('[data-slot="command-footer"]').exists()).toBe(true);
        });

        scopedIt("applies chin geometry classes", () => {
            const wrapper = mount(CommandFooter);
            const cls = wrapper.find('[data-slot="command-footer"]').classes();
            expect(cls).toContain("h-[var(--vueda-cmd-footer-height)]");
            expect(cls).toContain("border-t-hairline");
            expect(cls).toContain("bg-muted");
        });

        scopedIt("renders start and end slots in default layout", () => {
            const wrapper = mount(CommandFooter, {
                slots: {
                    start: '<span class="hint-start">↵ select</span>',
                    end: '<span class="hint-end">Esc close</span>',
                },
            });
            expect(wrapper.find(".hint-start").exists()).toBe(true);
            expect(wrapper.find(".hint-end").exists()).toBe(true);
        });

        scopedIt("default slot replaces layout entirely", () => {
            const wrapper = mount(CommandFooter, {
                slots: { default: '<span class="custom">custom</span>' },
            });
            expect(wrapper.find(".custom").exists()).toBe(true);
        });

        scopedIt("merges custom class", () => {
            const wrapper = mount(CommandFooter, { props: { class: "my-footer" } });
            expect(wrapper.find('[data-slot="command-footer"]').classes()).toContain("my-footer");
        });
    });
});
