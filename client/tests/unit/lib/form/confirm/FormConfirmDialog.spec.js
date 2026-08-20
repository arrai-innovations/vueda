import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import FormConfirmDialog from "@vueda/form/confirm/FormConfirmDialog.vue";

// This file exercises FormConfirmDialog's own logic in isolation, with the Reka-UI-backed
// alert-dialog primitives stubbed to passthroughs (AlertDialogCancel included -- its closing
// behavior is Reka's, not FormConfirmDialog's own, and is covered by FormConfirmDialog.reka.spec.js
// instead).
const AlertDialogStub = {
    props: ["open"],
    emits: ["update:open"],
    template: "<div><slot /></div>",
};
const passthrough = { template: "<div><slot /></div>" };
const stubs = {
    AlertDialog: AlertDialogStub,
    AlertDialogContent: passthrough,
    AlertDialogHeader: passthrough,
    AlertDialogTitle: passthrough,
    AlertDialogDescription: passthrough,
    AlertDialogFooter: passthrough,
    AlertDialogCancel: passthrough,
};

const makeController = (overrides = {}) => ({
    open: true,
    messages: {},
    confirm: vi.fn(),
    cancel: vi.fn(),
    ...overrides,
});

describe("lib/form/confirm/FormConfirmDialog.vue", () => {
    scopedIt("uses action-neutral default copy", () => {
        const controller = makeController({ messages: { count: ["unusual"] } });
        const wrapper = mount(FormConfirmDialog, { props: { controller }, global: { stubs } });

        expect(wrapper.text()).toContain("Confirm action");
        expect(wrapper.text()).toContain("This action has warnings. Review them before continuing.");
        expect(wrapper.text()).toContain("Continue anyway");
    });

    scopedIt("renders one item per warning message", () => {
        const controller = makeController({
            messages: { count: ["A negative count is unusual."], non_field_errors: ["Heads up."] },
        });
        const wrapper = mount(FormConfirmDialog, { props: { controller }, global: { stubs } });

        const items = wrapper.findAll("[data-qa=form-confirm-warning]");
        expect(items).toHaveLength(2);
        expect(wrapper.text()).toContain("A negative count is unusual.");
        expect(wrapper.text()).toContain("Heads up.");
    });

    scopedIt("calls controller.confirm when the action button is clicked", async () => {
        const controller = makeController({ messages: { count: ["unusual"] } });
        const wrapper = mount(FormConfirmDialog, { props: { controller }, global: { stubs } });

        await wrapper.find("[data-qa=form-confirm-action]").trigger("click");
        expect(controller.confirm).toHaveBeenCalledTimes(1);
        expect(controller.cancel).not.toHaveBeenCalled();
    });

    scopedIt("resolves cancel when the dialog closes (Escape, overlay, or the Cancel button)", async () => {
        const controller = makeController({ messages: { count: ["unusual"] } });
        const wrapper = mount(FormConfirmDialog, { props: { controller }, global: { stubs } });

        await wrapper.findComponent(AlertDialogStub).vm.$emit("update:open", false);

        expect(controller.cancel).toHaveBeenCalledTimes(1);
        expect(controller.confirm).not.toHaveBeenCalled();
    });

    scopedIt("does not resolve while the dialog is open", async () => {
        const controller = makeController({ messages: { count: ["unusual"] } });
        const wrapper = mount(FormConfirmDialog, { props: { controller }, global: { stubs } });

        await wrapper.findComponent(AlertDialogStub).vm.$emit("update:open", true);

        expect(controller.confirm).not.toHaveBeenCalled();
        expect(controller.cancel).not.toHaveBeenCalled();
    });

    scopedIt("registers on mount and unregisters on unmount", () => {
        const controller = makeController({ register: vi.fn(), unregister: vi.fn() });
        const wrapper = mount(FormConfirmDialog, { props: { controller }, global: { stubs } });

        expect(controller.register).toHaveBeenCalledTimes(1);
        expect(controller.unregister).not.toHaveBeenCalled();

        wrapper.unmount();
        expect(controller.unregister).toHaveBeenCalledTimes(1);
    });

    scopedIt("tolerates controllers without register/unregister", () => {
        const controller = makeController();
        const wrapper = mount(FormConfirmDialog, { props: { controller }, global: { stubs } });
        expect(() => wrapper.unmount()).not.toThrow();
    });
});
