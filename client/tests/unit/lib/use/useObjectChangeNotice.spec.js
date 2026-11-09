import { scopedIt } from "@tests/unit/utils.js";
import { useObjectChangeNotice } from "@vueda/use/useObjectChangeNotice.js";
import { defaultObjectRetrieve } from "@vueda/utils/objectCrud.js";
import { objectStreamsEnabled, watchObjectChanges } from "@vueda/utils/objectStreams.js";
import flushPromises from "flush-promises";
import { reactive } from "vue";

vi.mock("@vueda/utils/objectCrud.js", () => ({ defaultObjectRetrieve: vi.fn() }));
vi.mock("@vueda/utils/objectStreams.js", () => ({
    objectStreamsEnabled: vi.fn(() => true),
    watchObjectChanges: vi.fn(),
}));

describe("lib/use/useObjectChangeNotice.js", () => {
    let view;
    let stops;

    /** The change callback of the latest subscription. */
    const pushChange = (message = { type: "event", facet: "object", op: "updated" }) =>
        watchObjectChanges.mock.calls.at(-1)[1](message);

    function mount() {
        return useObjectChangeNotice({
            enabled: () => view.enabled,
            target: () => ({ app: "store", model: "customer" }),
            pk: () => view.pk,
            params: () => ({ f: ["id", "name"] }),
            object: () => view.object,
            busy: () => view.busy,
            reload: view.reload,
        });
    }

    beforeEach(() => {
        view = reactive({
            enabled: true,
            pk: "7",
            object: { id: "7", name: "Loaded" },
            busy: false,
            reload: vi.fn(),
        });
        stops = [];
        objectStreamsEnabled.mockReturnValue(true);
        watchObjectChanges.mockReset().mockImplementation(() => {
            const stop = vi.fn();
            stops.push(stop);
            return stop;
        });
        defaultObjectRetrieve.mockReset();
    });

    describe("Watching", () => {
        scopedIt("watches the record once the view enables it", () => {
            mount();

            expect(watchObjectChanges).toHaveBeenCalledWith(
                { target: { app: "store", model: "customer" }, pk: "7" },
                expect.any(Function),
            );
        });

        scopedIt("watches nothing before live updates are set up", () => {
            objectStreamsEnabled.mockReturnValue(false);

            mount();

            expect(watchObjectChanges).not.toHaveBeenCalled();
        });

        scopedIt("watches nothing while the view disables it", () => {
            view.enabled = false;

            mount();

            expect(watchObjectChanges).not.toHaveBeenCalled();
        });

        scopedIt("moves to the next record and clears the notice when the primary key changes", async () => {
            defaultObjectRetrieve.mockResolvedValue({ id: "7", name: "Saved elsewhere" });
            const notice = mount();
            pushChange();
            await flushPromises();
            expect(notice.changed).toBe(true);

            view.pk = "8";
            await flushPromises();

            expect(stops[0]).toHaveBeenCalled();
            expect(watchObjectChanges).toHaveBeenLastCalledWith(
                { target: { app: "store", model: "customer" }, pk: "8" },
                expect.any(Function),
            );
            expect(notice.changed).toBe(false);
        });
    });

    describe("Checking a change", () => {
        scopedIt("reports a saved record that differs from the one the view holds", async () => {
            defaultObjectRetrieve.mockResolvedValue({ id: "7", name: "Saved elsewhere" });
            const notice = mount();

            pushChange();
            await flushPromises();

            expect(defaultObjectRetrieve).toHaveBeenCalledWith({
                target: { app: "store", model: "customer" },
                pk: "7",
                params: { f: ["id", "name"] },
            });
            expect(notice.changed).toBe(true);
            expect(view.object).toEqual({ id: "7", name: "Loaded" });
        });

        scopedIt("stays quiet when the saved record matches, as after the user's own save", async () => {
            defaultObjectRetrieve.mockResolvedValue({ id: "7", name: "Loaded" });
            const notice = mount();

            pushChange();
            await flushPromises();

            expect(notice.changed).toBe(false);
        });

        scopedIt("waits while the view retrieves or saves", async () => {
            defaultObjectRetrieve.mockResolvedValue({ id: "7", name: "Saved by me" });
            view.busy = true;
            const notice = mount();

            pushChange();
            await flushPromises();
            expect(defaultObjectRetrieve).not.toHaveBeenCalled();

            view.object = { id: "7", name: "Saved by me" };
            view.busy = false;
            await flushPromises();

            expect(defaultObjectRetrieve).toHaveBeenCalledTimes(1);
            expect(notice.changed).toBe(false);
        });

        scopedIt("checks again when the view becomes busy before the check returns", async () => {
            let finish;
            defaultObjectRetrieve
                .mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
                .mockResolvedValueOnce({ id: "7", name: "Saved by me" });
            const notice = mount();
            pushChange();

            view.busy = true;
            finish({ id: "7", name: "Saved by me" });
            await flushPromises();
            expect(notice.changed).toBe(false);

            view.object = { id: "7", name: "Saved by me" };
            view.busy = false;
            await flushPromises();

            expect(defaultObjectRetrieve).toHaveBeenCalledTimes(2);
            expect(notice.changed).toBe(false);
        });

        scopedIt("stays quiet when the check fails", async () => {
            defaultObjectRetrieve.mockRejectedValue(new Error("network"));
            const notice = mount();

            pushChange();
            await flushPromises();

            expect(notice.changed).toBe(false);
        });

        scopedIt("reports a deleted record without a fetch", () => {
            const notice = mount();

            pushChange({ type: "event", facet: "object", op: "deleted" });

            expect(notice.deleted).toBe(true);
            expect(defaultObjectRetrieve).not.toHaveBeenCalled();
        });
    });

    describe("Reloading", () => {
        scopedIt("clears the notice and retrieves the record into the view", async () => {
            defaultObjectRetrieve.mockResolvedValue({ id: "7", name: "Saved elsewhere" });
            const notice = mount();
            pushChange();
            await flushPromises();

            notice.reload();

            expect(notice.changed).toBe(false);
            expect(view.reload).toHaveBeenCalledTimes(1);
        });

        scopedIt("checks the next change after a reload", async () => {
            defaultObjectRetrieve.mockResolvedValue({ id: "7", name: "Saved elsewhere" });
            const notice = mount();
            pushChange();
            await flushPromises();
            notice.reload();
            view.object = { id: "7", name: "Saved elsewhere" };
            defaultObjectRetrieve.mockResolvedValue({ id: "7", name: "Saved again" });

            pushChange();
            await flushPromises();

            expect(notice.changed).toBe(true);
        });
    });
});
