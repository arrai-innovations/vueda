import { scopedIt } from "@tests/unit/utils.js";
import { useObjectChangeNotice } from "@vueda/use/useObjectChangeNotice.js";
import { reactive } from "vue";

describe("lib/use/useObjectChangeNotice.js", () => {
    let view;

    function mount() {
        return useObjectChangeNotice({
            enabled: () => view.enabled,
            current: () => view.current,
            baseline: () => view.baseline,
            deleted: () => view.deleted,
            busy: () => view.busy,
            reload: view.reload,
        });
    }

    beforeEach(() => {
        view = reactive({
            enabled: true,
            current: { id: "7", name: "Loaded" },
            baseline: { id: "7", name: "Loaded" },
            deleted: false,
            busy: false,
            reload: vi.fn(),
        });
    });

    scopedIt("stays clear while the saved record matches the form's baseline", () => {
        expect(mount().changed).toBe(false);
    });

    scopedIt("reports a saved record that differs from the form's baseline", () => {
        const notice = mount();

        view.current = { id: "7", name: "Saved elsewhere" };

        expect(notice.changed).toBe(true);
    });

    scopedIt("stays clear while the view retrieves or saves", () => {
        const notice = mount();
        view.busy = true;

        view.current = { id: "7", name: "Saved by me" };
        expect(notice.changed).toBe(false);

        view.baseline = { id: "7", name: "Saved by me" };
        view.busy = false;
        expect(notice.changed).toBe(false);
    });

    scopedIt("reports a deleted record instead of a changed one", () => {
        const notice = mount();

        view.deleted = true;
        view.current = {};

        expect(notice.deleted).toBe(true);
        expect(notice.changed).toBe(false);
    });

    scopedIt("reports nothing while disabled", () => {
        view.enabled = false;
        const notice = mount();

        view.current = { id: "7", name: "Saved elsewhere" };
        view.deleted = true;

        expect(notice.changed).toBe(false);
        expect(notice.deleted).toBe(false);
    });

    scopedIt("reloads through the view", () => {
        mount().reload();

        expect(view.reload).toHaveBeenCalledTimes(1);
    });
});
