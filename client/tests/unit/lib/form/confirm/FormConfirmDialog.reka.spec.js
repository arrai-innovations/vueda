import { scopedIt } from "@tests/unit/utils.js";
import { DOMWrapper, mount } from "@vue/test-utils";
import FormConfirmDialog from "@vueda/form/confirm/FormConfirmDialog.vue";
import { nextTick } from "vue";

// Unlike FormConfirmDialog.spec.js (which stubs the alert-dialog primitives to test this
// component's own markup/logic in isolation),
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
    // AlertDialogContent teleports into document.body, outside the mounted wrapper's own element,
    // so `attachTo: document.body` mounts don't get cleaned up by the normal wrapper-unmount
    // machinery between tests. Without this, a later test's `body().find(...)` can silently match a
    // stale element left over from an earlier test's dialog.
    afterEach(() => {
        document.body.innerHTML = "";
    });

    scopedIt("clicking the action button calls confirm, and not cancel", async () => {
        const controller = makeController();
        mount(FormConfirmDialog, { props: { controller }, attachTo: document.body });
        // AlertDialogContent teleports into document.body; give Reka's Presence/mount machinery a
        // tick to actually insert it before querying for the buttons.
        await nextTick();

        await body().find('[data-qa="form-confirm-action"]').trigger("click");

        expect(controller.confirm).toHaveBeenCalledTimes(1);
        expect(controller.cancel).not.toHaveBeenCalled();
    });

    scopedIt("clicking the cancel button calls cancel, and not confirm", async () => {
        const controller = makeController();
        mount(FormConfirmDialog, { props: { controller }, attachTo: document.body });
        await nextTick();

        await body().find('[data-qa="form-confirm-cancel"]').trigger("click");

        expect(controller.cancel).toHaveBeenCalledTimes(1);
        expect(controller.confirm).not.toHaveBeenCalled();
    });
});
