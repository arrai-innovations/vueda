import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import AlertDialog from "@vueda/shell/alert-dialog/AlertDialog.vue";
import AlertDialogAction from "@vueda/shell/alert-dialog/AlertDialogAction.vue";
import AlertDialogCancel from "@vueda/shell/alert-dialog/AlertDialogCancel.vue";
import AlertDialogContent from "@vueda/shell/alert-dialog/AlertDialogContent.vue";
import AlertDialogDescription from "@vueda/shell/alert-dialog/AlertDialogDescription.vue";
import AlertDialogFooter from "@vueda/shell/alert-dialog/AlertDialogFooter.vue";
import AlertDialogHeader from "@vueda/shell/alert-dialog/AlertDialogHeader.vue";
import AlertDialogTitle from "@vueda/shell/alert-dialog/AlertDialogTitle.vue";
import Dialog from "@vueda/shell/dialog/Dialog.vue";
import DialogContent from "@vueda/shell/dialog/DialogContent.vue";
import DialogDescription from "@vueda/shell/dialog/DialogDescription.vue";
import DialogFooter from "@vueda/shell/dialog/DialogFooter.vue";
import DialogHeader from "@vueda/shell/dialog/DialogHeader.vue";
import DialogTitle from "@vueda/shell/dialog/DialogTitle.vue";

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
        components: { Dialog, DialogContent },
        setup() {
            return { open, contentProps };
        },
        template: `
            <Dialog :open="open">
                <DialogContent v-bind="contentProps">Dialog body</DialogContent>
            </Dialog>
        `,
    });

const mountAlertDialog = () =>
    mount({
        components: {
            AlertDialog,
            AlertDialogContent,
            AlertDialogAction,
            AlertDialogCancel,
        },
        template: `
            <AlertDialog :open="true">
                <AlertDialogContent>
                    <AlertDialogAction>Confirm</AlertDialogAction>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                </AlertDialogContent>
            </AlertDialog>
        `,
    });

describe("lib/shell/dialog/Dialog.vue", () => {
    describe("DialogContent", () => {
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
            const content = wrapper.find('[data-slot="dialog-content"]');
            expect(content.classes()).toContain("fixed");
            expect(content.classes()).toContain("top-[50%]");
            expect(content.classes()).toContain("text-foreground");
        });

        scopedIt("uses mutually exclusive full-screen geometry", () => {
            const wrapper = mountDialog(true, { fullScreen: true });
            const content = wrapper.find('[data-slot="dialog-content"]');

            expect(content.classes()).toContain("inset-0");
            expect(content.classes()).toContain("h-dvh");
            expect(content.classes()).toContain("p-0");
            expect(content.classes()).not.toContain("top-[50%]");
            expect(content.classes()).not.toContain("translate-x-[-50%]");
            expect(content.classes()).not.toContain("p-6");
            expect(content.attributes("full-screen")).toBeUndefined();
        });

        scopedIt("merges custom class", () => {
            const wrapper = mountDialog(true, { class: "my-dialog" });
            expect(wrapper.find('[data-slot="dialog-content"]').classes()).toContain("my-dialog");
        });
    });

    describe("DialogHeader", () => {
        scopedIt("has data-slot=dialog-header", () => {
            const w = mount(DialogHeader);
            expect(w.attributes("data-slot")).toBe("dialog-header");
        });

        scopedIt("applies base flex layout classes", () => {
            const w = mount(DialogHeader);
            expect(w.classes()).toContain("flex");
            expect(w.classes()).toContain("flex-col");
        });
    });

    describe("DialogFooter", () => {
        scopedIt("has data-slot=dialog-footer", () => {
            const w = mount(DialogFooter);
            expect(w.attributes("data-slot")).toBe("dialog-footer");
        });

        scopedIt("applies base flex layout classes", () => {
            const w = mount(DialogFooter);
            expect(w.classes()).toContain("flex");
        });
    });

    describe("DialogTitle", () => {
        scopedIt("has data-slot=dialog-title", () => {
            const w = mount(DialogTitle);
            expect(w.attributes("data-slot")).toBe("dialog-title");
        });
    });

    describe("DialogDescription", () => {
        scopedIt("has data-slot=dialog-description", () => {
            const w = mount(DialogDescription);
            expect(w.attributes("data-slot")).toBe("dialog-description");
        });
    });
});

describe("lib/shell/alert-dialog/AlertDialog.vue", () => {
    describe("AlertDialogContent", () => {
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
            const content = wrapper.find('[data-slot="alert-dialog-content"]');
            expect(content.classes()).toContain("fixed");
            expect(content.classes()).toContain("text-foreground");
        });
    });

    describe("AlertDialogAction", () => {
        scopedIt("applies primary button classes", () => {
            const wrapper = mount(AlertDialogAction);
            expect(wrapper.classes()).toContain("bg-primary");
        });
    });

    describe("AlertDialogCancel", () => {
        scopedIt("applies outline button classes", () => {
            const wrapper = mount(AlertDialogCancel);
            expect(wrapper.classes()).toContain("border");
            expect(wrapper.classes()).toContain("bg-background");
        });
    });

    describe("AlertDialogHeader", () => {
        scopedIt("has data-slot=alert-dialog-header", () => {
            const w = mount(AlertDialogHeader);
            expect(w.attributes("data-slot")).toBe("alert-dialog-header");
        });
    });

    describe("AlertDialogFooter", () => {
        scopedIt("has data-slot=alert-dialog-footer", () => {
            const w = mount(AlertDialogFooter);
            expect(w.attributes("data-slot")).toBe("alert-dialog-footer");
        });
    });

    describe("AlertDialogTitle", () => {
        scopedIt("has data-slot=alert-dialog-title", () => {
            const w = mount(AlertDialogTitle);
            expect(w.attributes("data-slot")).toBe("alert-dialog-title");
        });
    });

    describe("AlertDialogDescription", () => {
        scopedIt("has data-slot=alert-dialog-description", () => {
            const w = mount(AlertDialogDescription);
            expect(w.attributes("data-slot")).toBe("alert-dialog-description");
        });
    });
});
