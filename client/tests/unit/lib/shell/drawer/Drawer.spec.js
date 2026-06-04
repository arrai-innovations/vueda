import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import Drawer from "@vueda/shell/drawer/Drawer.vue";
import DrawerClose from "@vueda/shell/drawer/DrawerClose.vue";
import DrawerContent from "@vueda/shell/drawer/DrawerContent.vue";
import DrawerDescription from "@vueda/shell/drawer/DrawerDescription.vue";
import DrawerFooter from "@vueda/shell/drawer/DrawerFooter.vue";
import DrawerHeader from "@vueda/shell/drawer/DrawerHeader.vue";
import DrawerTitle from "@vueda/shell/drawer/DrawerTitle.vue";
import DrawerTrigger from "@vueda/shell/drawer/DrawerTrigger.vue";

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
        components: { Drawer, DrawerContent },
        setup() {
            return { open, contentProps };
        },
        template: `
            <Drawer :open="open">
                <DrawerContent v-bind="contentProps">Drawer body</DrawerContent>
            </Drawer>
        `,
    });

describe("lib/shell/drawer/Drawer.vue", () => {
    describe("DrawerContent", () => {
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

    describe("DrawerHeader", () => {
        scopedIt("has data-slot=drawer-header", () => {
            const w = mount(DrawerHeader);
            expect(w.attributes("data-slot")).toBe("drawer-header");
        });

        scopedIt("applies base flex layout classes", () => {
            const w = mount(DrawerHeader);
            expect(w.classes()).toContain("flex");
            expect(w.classes()).toContain("flex-col");
        });
    });

    describe("DrawerFooter", () => {
        scopedIt("has data-slot=drawer-footer", () => {
            const w = mount(DrawerFooter);
            expect(w.attributes("data-slot")).toBe("drawer-footer");
        });

        scopedIt("applies base flex layout classes", () => {
            const w = mount(DrawerFooter);
            expect(w.classes()).toContain("flex");
        });
    });

    describe("DrawerTitle", () => {
        scopedIt("has data-slot=drawer-title", () => {
            const w = mount(DrawerTitle);
            expect(w.attributes("data-slot")).toBe("drawer-title");
        });
    });

    describe("DrawerDescription", () => {
        scopedIt("has data-slot=drawer-description", () => {
            const w = mount(DrawerDescription);
            expect(w.attributes("data-slot")).toBe("drawer-description");
        });
    });

    describe("DrawerTrigger", () => {
        scopedIt("has data-slot=drawer-trigger", () => {
            const w = mount(DrawerTrigger);
            expect(w.attributes("data-slot")).toBe("drawer-trigger");
        });
    });

    describe("DrawerClose", () => {
        scopedIt("has data-slot=drawer-close", () => {
            const w = mount(DrawerClose);
            expect(w.attributes("data-slot")).toBe("drawer-close");
        });
    });
});
