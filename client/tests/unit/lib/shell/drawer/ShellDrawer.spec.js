import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ShellDrawer from "@vueda/shell/drawer/ShellDrawer.vue";
import ShellDrawerClose from "@vueda/shell/drawer/ShellDrawerClose.vue";
import ShellDrawerContent from "@vueda/shell/drawer/ShellDrawerContent.vue";
import ShellDrawerDescription from "@vueda/shell/drawer/ShellDrawerDescription.vue";
import ShellDrawerFooter from "@vueda/shell/drawer/ShellDrawerFooter.vue";
import ShellDrawerHeader from "@vueda/shell/drawer/ShellDrawerHeader.vue";
import ShellDrawerTitle from "@vueda/shell/drawer/ShellDrawerTitle.vue";
import ShellDrawerTrigger from "@vueda/shell/drawer/ShellDrawerTrigger.vue";

// Stub portals and primitives that require context from vaul-vue and reka-ui.
// This keeps tests focused on our wrappers' own contributions (data-slot, classes, conditional
// rendering) without depending on vaul-vue's or reka-ui's context machinery in jsdom.
vi.mock("vaul-vue", async (importOriginal) => {
    const actual = await importOriginal();
    const { defineComponent, h } = await import("vue");
    const inline = (name) =>
        defineComponent({
            name,
            setup(_, { slots, attrs }) {
                return () => h("div", attrs, slots.default?.({}));
            },
        });
    return {
        ...actual,
        DrawerRoot: inline("DrawerRoot"),
        DrawerPortal: inline("DrawerPortal"),
        DrawerContent: inline("DrawerContent"),
        DrawerOverlay: inline("DrawerOverlay"),
    };
});

vi.mock("reka-ui", async (importOriginal) => {
    const actual = await importOriginal();
    const { defineComponent, h } = await import("vue");
    const inline = (name) =>
        defineComponent({
            name,
            setup(_, { slots, attrs }) {
                return () => h("div", attrs, slots.default?.());
            },
        });
    return {
        ...actual,
        DialogClose: inline("DialogClose"),
        DialogTitle: inline("DialogTitle"),
        DialogDescription: inline("DialogDescription"),
        DialogTrigger: inline("DialogTrigger"),
    };
});

const mountDrawer = (open, contentProps = {}) =>
    mount({
        components: { ShellDrawer, ShellDrawerContent },
        setup() {
            return { open, contentProps };
        },
        template: `
            <ShellDrawer :open="open">
                <ShellDrawerContent v-bind="contentProps">Drawer body</ShellDrawerContent>
            </ShellDrawer>
        `,
    });

describe("lib/shell/drawer/ShellDrawer.vue", () => {
    describe("ShellDrawerContent", () => {
        scopedIt("has data-slot=drawer-content", () => {
            const wrapper = mountDrawer(true);
            expect(wrapper.find('[data-slot="drawer-content"]').exists()).toBe(true);
        });

        scopedIt("renders the overlay", () => {
            const wrapper = mountDrawer(true);
            expect(wrapper.find('[data-slot="drawer-overlay"]').exists()).toBe(true);
        });

        scopedIt("renders slot content", () => {
            const wrapper = mountDrawer(true);
            expect(wrapper.find('[data-slot="drawer-content"]').text()).toContain("Drawer body");
        });

        scopedIt("renders the drag handle", () => {
            const wrapper = mountDrawer(true);
            const content = wrapper.find('[data-slot="drawer-content"]');
            expect(content.find("div").exists()).toBe(true);
        });

        scopedIt("applies base positioning classes", () => {
            const wrapper = mountDrawer(true);
            expect(wrapper.find('[data-slot="drawer-content"]').classes()).toContain("fixed");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mountDrawer(true, { class: "my-drawer" });
            expect(wrapper.find('[data-slot="drawer-content"]').classes()).toContain("my-drawer");
        });
    });

    describe("ShellDrawerHeader", () => {
        scopedIt("has data-slot=drawer-header", () => {
            const w = mount(ShellDrawerHeader);
            expect(w.attributes("data-slot")).toBe("drawer-header");
        });

        scopedIt("applies base flex layout classes", () => {
            const w = mount(ShellDrawerHeader);
            expect(w.classes()).toContain("flex");
            expect(w.classes()).toContain("flex-col");
        });
    });

    describe("ShellDrawerFooter", () => {
        scopedIt("has data-slot=drawer-footer", () => {
            const w = mount(ShellDrawerFooter);
            expect(w.attributes("data-slot")).toBe("drawer-footer");
        });

        scopedIt("applies base flex layout classes", () => {
            const w = mount(ShellDrawerFooter);
            expect(w.classes()).toContain("flex");
        });
    });

    describe("ShellDrawerTitle", () => {
        scopedIt("has data-slot=drawer-title", () => {
            const w = mount(ShellDrawerTitle);
            expect(w.attributes("data-slot")).toBe("drawer-title");
        });
    });

    describe("ShellDrawerDescription", () => {
        scopedIt("has data-slot=drawer-description", () => {
            const w = mount(ShellDrawerDescription);
            expect(w.attributes("data-slot")).toBe("drawer-description");
        });
    });

    describe("ShellDrawerTrigger", () => {
        scopedIt("has data-slot=drawer-trigger", () => {
            const w = mount(ShellDrawerTrigger);
            expect(w.attributes("data-slot")).toBe("drawer-trigger");
        });
    });

    describe("ShellDrawerClose", () => {
        scopedIt("has data-slot=drawer-close", () => {
            const w = mount(ShellDrawerClose);
            expect(w.attributes("data-slot")).toBe("drawer-close");
        });
    });
});
