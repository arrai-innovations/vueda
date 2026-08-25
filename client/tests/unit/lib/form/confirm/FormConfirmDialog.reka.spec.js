import { scopedIt } from "@tests/unit/utils.js";
import { DOMWrapper, mount } from "@vue/test-utils";
import FormConfirmDialog from "@vueda/form/confirm/FormConfirmDialog.vue";
import { nextTick } from "vue";

// Unlike FormConfirmDialog.spec.js (which stubs the alert-dialog primitives to test this
// component's own markup/logic in isolation), this file mounts the real Reka UI primitives to
// verify the user-facing gestures they implement (button clicks, Escape, and the overlay).
const makeController = (overrides = {}) => ({
    open: true,
    messages: { count: ["unusual"] },
    confirm: vi.fn(),
    cancel: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
    ...overrides,
});

const body = () => new DOMWrapper(document.body);

describe("lib/form/confirm/FormConfirmDialog.vue (real Reka UI primitives)", () => {
    scopedIt("clicking the action button calls confirm, and not cancel", async () => {
        const controller = makeController();
        const wrapper = mount(FormConfirmDialog, { props: { controller }, attachTo: document.body });
        onTestFinished(() => wrapper.unmount());
        // AlertDialogContent teleports into document.body; give Reka's Presence/mount machinery a
        // tick to actually insert it before querying for the buttons.
        await nextTick();

        await body().find('[data-qa="form-confirm-action"]').trigger("click");

        expect(controller.confirm).toHaveBeenCalledTimes(1);
        expect(controller.cancel).not.toHaveBeenCalled();
    });

    scopedIt("clicking the cancel button calls cancel, and not confirm", async () => {
        const controller = makeController();
        const wrapper = mount(FormConfirmDialog, { props: { controller }, attachTo: document.body });
        onTestFinished(() => wrapper.unmount());
        await nextTick();

        await body().find('[data-qa="form-confirm-cancel"]').trigger("click");

        expect(controller.cancel).toHaveBeenCalledTimes(1);
        expect(controller.confirm).not.toHaveBeenCalled();
    });

    scopedIt("pressing Escape calls cancel, and not confirm", async () => {
        const controller = makeController();
        const wrapper = mount(FormConfirmDialog, { props: { controller }, attachTo: document.body });
        onTestFinished(() => wrapper.unmount());
        await nextTick();

        await body().trigger("keydown", { key: "Escape" });

        expect(controller.cancel).toHaveBeenCalledTimes(1);
        expect(controller.confirm).not.toHaveBeenCalled();
    });

    scopedIt("clicking the overlay calls neither cancel nor confirm", async () => {
        const controller = makeController();
        const wrapper = mount(FormConfirmDialog, { props: { controller }, attachTo: document.body });
        onTestFinished(() => wrapper.unmount());
        await nextTick();
        // Reka registers its outside-pointerdown listener on a zero-delay timer after mount (to
        // avoid reacting to the pointerdown that triggered the mount itself); wait past it.
        await new Promise((resolve) => setTimeout(resolve, 0));

        // AlertDialogContent prevents outside interaction, so the overlay is not a dismiss gesture:
        // an AlertDialog requires an explicit choice (Escape or one of its own buttons), unlike a
        // plain Dialog, where clicking outside the content does dismiss it.
        await body().find('[data-slot="alert-dialog-overlay"]').trigger("pointerdown");

        expect(controller.cancel).not.toHaveBeenCalled();
        expect(controller.confirm).not.toHaveBeenCalled();
    });
});
