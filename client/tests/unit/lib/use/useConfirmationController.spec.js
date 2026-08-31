import { scopedIt } from "@tests/unit/utils.js";
import { useConfirmationController } from "@vueda/use/useConfirmationController.js";

describe("lib/use/useConfirmationController.js", () => {
    scopedIt("starts closed with empty messages and bulk:false", () => {
        const confirmation = useConfirmationController();

        expect(confirmation.open).toBe(false);
        expect(confirmation.messages).toEqual({});
        expect(confirmation.bulk).toBe(false);
        expect(confirmation.consumers).toBe(0);
    });

    scopedIt("request defaults bulk to false when the caller omits the options argument", async () => {
        const confirmation = useConfirmationController();
        confirmation.register();

        const pending = confirmation.request({ count: ["unusual"] });

        expect(confirmation.open).toBe(true);
        expect(confirmation.messages).toEqual({ count: ["unusual"] });
        expect(confirmation.bulk).toBe(false);

        confirmation.cancel();
        await pending;
    });

    scopedIt("request records bulk:true when the caller reports the per-object shape", async () => {
        const confirmation = useConfirmationController();
        confirmation.register();

        const pending = confirmation.request({ 9: { count: ["unusual"] } }, { bulk: true });

        expect(confirmation.bulk).toBe(true);
        expect(confirmation.messages).toEqual({ 9: { count: ["unusual"] } });

        confirmation.cancel();
        await pending;
    });

    scopedIt("a later request's bulk value overwrites an earlier round's", async () => {
        const confirmation = useConfirmationController();
        confirmation.register();

        const first = confirmation.request({ 1: { count: ["unusual"] } }, { bulk: true });
        confirmation.cancel();
        await first;

        const second = confirmation.request({ count: ["unusual"] }, { bulk: false });
        expect(confirmation.bulk).toBe(false);
        confirmation.cancel();
        await second;
    });

    scopedIt("confirm resolves the pending request with true", async () => {
        const confirmation = useConfirmationController();
        confirmation.register();

        const pending = confirmation.request({ count: ["unusual"] });
        confirmation.confirm();

        await expect(pending).resolves.toBe(true);
        expect(confirmation.open).toBe(false);
    });

    scopedIt("cancel resolves the pending request with false", async () => {
        const confirmation = useConfirmationController();
        confirmation.register();

        const pending = confirmation.request({ count: ["unusual"] });
        confirmation.cancel();

        await expect(pending).resolves.toBe(false);
        expect(confirmation.open).toBe(false);
    });

    scopedIt("fails closed and records bulk when no consumer is registered", async () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const confirmation = useConfirmationController();

        const result = await confirmation.request({ 9: { count: ["unusual"] } }, { bulk: true });

        expect(result).toBe(false);
        expect(confirmation.open).toBe(false);
        expect(confirmation.bulk).toBe(true);
        expect(confirmation.messages).toEqual({ 9: { count: ["unusual"] } });
        expect(warnSpy).toHaveBeenCalledTimes(1);
        warnSpy.mockRestore();
    });

    scopedIt("uses the caller-supplied no-consumer warning message", async () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const confirmation = useConfirmationController({ noConsumerWarning: "custom warning" });

        await confirmation.request({ count: ["unusual"] });

        expect(warnSpy).toHaveBeenCalledWith("custom warning");
        warnSpy.mockRestore();
    });

    scopedIt("register/unregister track the consumer count", () => {
        const confirmation = useConfirmationController();

        confirmation.register();
        expect(confirmation.consumers).toBe(1);
        confirmation.register();
        expect(confirmation.consumers).toBe(2);

        confirmation.unregister();
        expect(confirmation.consumers).toBe(1);
        confirmation.unregister();
        expect(confirmation.consumers).toBe(0);
    });

    scopedIt("unregister never drops the consumer count below zero", () => {
        const confirmation = useConfirmationController();

        confirmation.unregister();

        expect(confirmation.consumers).toBe(0);
    });
});
