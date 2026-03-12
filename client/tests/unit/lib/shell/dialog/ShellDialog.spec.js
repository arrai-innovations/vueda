import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import ShellAlertDialog from "@vueda/shell/alert-dialog/ShellAlertDialog.vue";
import ShellAlertDialogAction from "@vueda/shell/alert-dialog/ShellAlertDialogAction.vue";
import ShellAlertDialogCancel from "@vueda/shell/alert-dialog/ShellAlertDialogCancel.vue";
import ShellAlertDialogContent from "@vueda/shell/alert-dialog/ShellAlertDialogContent.vue";
import ShellAlertDialogDescription from "@vueda/shell/alert-dialog/ShellAlertDialogDescription.vue";
import ShellAlertDialogFooter from "@vueda/shell/alert-dialog/ShellAlertDialogFooter.vue";
import ShellAlertDialogHeader from "@vueda/shell/alert-dialog/ShellAlertDialogHeader.vue";
import ShellAlertDialogTitle from "@vueda/shell/alert-dialog/ShellAlertDialogTitle.vue";
import ShellDialog from "@vueda/shell/dialog/ShellDialog.vue";
import ShellDialogContent from "@vueda/shell/dialog/ShellDialogContent.vue";
import ShellDialogDescription from "@vueda/shell/dialog/ShellDialogDescription.vue";
import ShellDialogFooter from "@vueda/shell/dialog/ShellDialogFooter.vue";
import ShellDialogHeader from "@vueda/shell/dialog/ShellDialogHeader.vue";
import ShellDialogTitle from "@vueda/shell/dialog/ShellDialogTitle.vue";

// Stub portals as inline renderers and dialog primitives that require context.
// This keeps tests focused on our wrappers' own contributions (data-slot, classes, conditional
// rendering) without depending on Reka UI's portal or context machinery in jsdom.
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
        DialogPortal: inline("DialogPortal"),
        AlertDialogPortal: inline("AlertDialogPortal"),
        // Reka dialog/alert-dialog primitives require DialogRoot/AlertDialogRoot context.
        // Stub them so sub-components can be tested independently.
        DialogContent: inline("DialogContent"),
        DialogOverlay: inline("DialogOverlay"),
        DialogClose: inline("DialogClose"),
        DialogTitle: inline("DialogTitle"),
        DialogDescription: inline("DialogDescription"),
        AlertDialogContent: inline("AlertDialogContent"),
        AlertDialogOverlay: inline("AlertDialogOverlay"),
        AlertDialogAction: inline("AlertDialogAction"),
        AlertDialogCancel: inline("AlertDialogCancel"),
        AlertDialogTitle: inline("AlertDialogTitle"),
        AlertDialogDescription: inline("AlertDialogDescription"),
    };
});

const mountDialog = (open, contentProps = {}) =>
    mount({
        components: { ShellDialog, ShellDialogContent },
        setup() {
            return { open, contentProps };
        },
        template: `
            <ShellDialog :open="open">
                <ShellDialogContent v-bind="contentProps">Dialog body</ShellDialogContent>
            </ShellDialog>
        `,
    });

const mountAlertDialog = () =>
    mount({
        components: {
            ShellAlertDialog,
            ShellAlertDialogContent,
            ShellAlertDialogAction,
            ShellAlertDialogCancel,
        },
        template: `
            <ShellAlertDialog :open="true">
                <ShellAlertDialogContent>
                    <ShellAlertDialogAction>Confirm</ShellAlertDialogAction>
                    <ShellAlertDialogCancel>Cancel</ShellAlertDialogCancel>
                </ShellAlertDialogContent>
            </ShellAlertDialog>
        `,
    });

describe("lib/shell/dialog/ShellDialog.vue", () => {
    describe("ShellDialogContent", () => {
        scopedIt("has data-slot=dialog-content", () => {
            const wrapper = mountDialog(true);
            expect(wrapper.find('[data-slot="dialog-content"]').exists()).toBe(true);
        });

        scopedIt("renders the overlay", () => {
            const wrapper = mountDialog(true);
            expect(wrapper.find('[data-slot="dialog-overlay"]').exists()).toBe(true);
        });

        scopedIt("renders slot content", () => {
            const wrapper = mountDialog(true);
            expect(wrapper.find('[data-slot="dialog-content"]').text()).toContain("Dialog body");
        });

        scopedIt("shows the close button by default", () => {
            const wrapper = mountDialog(true);
            expect(wrapper.find('[data-slot="dialog-close"]').exists()).toBe(true);
        });

        scopedIt("hides the close button when showCloseButton is false", () => {
            const wrapper = mountDialog(true, { showCloseButton: false });
            expect(wrapper.find('[data-slot="dialog-close"]').exists()).toBe(false);
        });

        scopedIt("applies base positioning classes", () => {
            const wrapper = mountDialog(true);
            expect(wrapper.find('[data-slot="dialog-content"]').classes()).toContain("fixed");
        });

        scopedIt("merges custom class", () => {
            const wrapper = mountDialog(true, { class: "my-dialog" });
            expect(wrapper.find('[data-slot="dialog-content"]').classes()).toContain("my-dialog");
        });
    });

    describe("ShellDialogHeader", () => {
        scopedIt("has data-slot=dialog-header", () => {
            const w = mount(ShellDialogHeader);
            expect(w.attributes("data-slot")).toBe("dialog-header");
        });

        scopedIt("applies base flex layout classes", () => {
            const w = mount(ShellDialogHeader);
            expect(w.classes()).toContain("flex");
            expect(w.classes()).toContain("flex-col");
        });
    });

    describe("ShellDialogFooter", () => {
        scopedIt("has data-slot=dialog-footer", () => {
            const w = mount(ShellDialogFooter);
            expect(w.attributes("data-slot")).toBe("dialog-footer");
        });

        scopedIt("applies base flex layout classes", () => {
            const w = mount(ShellDialogFooter);
            expect(w.classes()).toContain("flex");
        });
    });

    describe("ShellDialogTitle", () => {
        scopedIt("has data-slot=dialog-title", () => {
            const w = mount(ShellDialogTitle);
            expect(w.attributes("data-slot")).toBe("dialog-title");
        });
    });

    describe("ShellDialogDescription", () => {
        scopedIt("has data-slot=dialog-description", () => {
            const w = mount(ShellDialogDescription);
            expect(w.attributes("data-slot")).toBe("dialog-description");
        });
    });
});

describe("lib/shell/alert-dialog/ShellAlertDialog.vue", () => {
    describe("ShellAlertDialogContent", () => {
        scopedIt("has data-slot=alert-dialog-content", () => {
            const wrapper = mountAlertDialog();
            expect(wrapper.find('[data-slot="alert-dialog-content"]').exists()).toBe(true);
        });

        scopedIt("renders the overlay", () => {
            const wrapper = mountAlertDialog();
            expect(wrapper.find('[data-slot="alert-dialog-overlay"]').exists()).toBe(true);
        });

        scopedIt("applies base positioning classes", () => {
            const wrapper = mountAlertDialog();
            expect(wrapper.find('[data-slot="alert-dialog-content"]').classes()).toContain("fixed");
        });
    });

    describe("ShellAlertDialogAction", () => {
        scopedIt("applies primary button classes", () => {
            const wrapper = mount(ShellAlertDialogAction);
            expect(wrapper.classes()).toContain("bg-primary");
        });
    });

    describe("ShellAlertDialogCancel", () => {
        scopedIt("applies outline button classes", () => {
            const wrapper = mount(ShellAlertDialogCancel);
            expect(wrapper.classes()).toContain("border");
            expect(wrapper.classes()).toContain("bg-background");
        });
    });

    describe("ShellAlertDialogHeader", () => {
        scopedIt("has data-slot=alert-dialog-header", () => {
            const w = mount(ShellAlertDialogHeader);
            expect(w.attributes("data-slot")).toBe("alert-dialog-header");
        });
    });

    describe("ShellAlertDialogFooter", () => {
        scopedIt("has data-slot=alert-dialog-footer", () => {
            const w = mount(ShellAlertDialogFooter);
            expect(w.attributes("data-slot")).toBe("alert-dialog-footer");
        });
    });

    describe("ShellAlertDialogTitle", () => {
        scopedIt("has data-slot=alert-dialog-title", () => {
            const w = mount(ShellAlertDialogTitle);
            expect(w.attributes("data-slot")).toBe("alert-dialog-title");
        });
    });

    describe("ShellAlertDialogDescription", () => {
        scopedIt("has data-slot=alert-dialog-description", () => {
            const w = mount(ShellAlertDialogDescription);
            expect(w.attributes("data-slot")).toBe("alert-dialog-description");
        });
    });
});
