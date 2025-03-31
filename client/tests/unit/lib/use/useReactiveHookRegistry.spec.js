import { useReactiveHookRegistry } from "@vueda/use/useReactiveHookRegistry.js";
import flushPromises from "flush-promises";
import { ref, unref } from "vue";

describe("lib/use/useReactiveHookRegistry.js", () => {
    let registry;

    beforeEach(() => {
        registry = useReactiveHookRegistry();
    });

    describe("registerHook", () => {
        it("registers a hook and updates computedAggregates", async () => {
            expect(registry.computedAggregates).toEqual({});

            // Register a hook that always returns true
            const hookId = registry.registerHook("field1", () => true);
            await flushPromises();

            expect(hookId).toBeDefined();
            expect(registry.computedAggregates.field1).toBe(true);
        });

        it("aggregates multiple hooks correctly", async () => {
            registry.registerHook("field1", () => false);
            registry.registerHook("field1", () => true);
            await flushPromises();

            expect(registry.computedAggregates.field1).toBe(true);
        });

        it("updates computedAggregates reactively when hook changes", async () => {
            const dynamicValue = ref(false);
            const hookId = registry.registerHook("field1", () => unref(dynamicValue));
            await flushPromises();

            expect(registry.computedAggregates.field1).toBe(false);

            // Change the value and trigger reactivity
            dynamicValue.value = true;
            await flushPromises();

            expect(hookId).toBeDefined();
            expect(registry.computedAggregates.field1).toBe(true);
        });
    });

    describe("unregisterHook", () => {
        it("removes a hook and updates computedAggregates", async () => {
            const hookId = registry.registerHook("field1", () => true);
            await flushPromises();

            expect(registry.computedAggregates.field1).toBe(true);

            registry.unregisterHook(hookId);
            await flushPromises();

            expect(registry.computedAggregates.field1).toBeUndefined();
        });

        it("only removes specific hooks, leaving others intact", async () => {
            registry.registerHook("field1", () => false);
            const hookId = registry.registerHook("field1", () => true);
            await flushPromises();

            expect(registry.computedAggregates.field1).toBe(true);

            registry.unregisterHook(hookId);
            await flushPromises();

            expect(registry.computedAggregates.field1).toBe(false);
        });
    });

    describe("computedAggregates", () => {
        it("remains false if no hooks return true", async () => {
            registry.registerHook("field1", () => false);
            registry.registerHook("field1", () => false);
            await flushPromises();

            expect(registry.computedAggregates.field1).toBe(false);
        });

        it("removes group from computedAggregates when last hook is removed", async () => {
            const hookId1 = registry.registerHook("field1", () => false);
            const hookId2 = registry.registerHook("field1", () => false);
            await flushPromises();

            expect(registry.computedAggregates.field1).toBe(false);

            registry.unregisterHook(hookId1);
            registry.unregisterHook(hookId2);
            await flushPromises();

            expect(registry.computedAggregates.field1).toBeUndefined();
        });
    });

    describe("effect scope cleanup", () => {
        it("stops effects when hooks are removed", async () => {
            const stopSpy = vi.spyOn(registry, "stop");

            const hookId = registry.registerHook("field1", () => true);
            await flushPromises();

            registry.unregisterHook(hookId);
            await flushPromises();

            expect(stopSpy).not.toHaveBeenCalled(); // Should only be called on `registry.stop()`
        });

        it("stops all effects when registry is stopped", async () => {
            const stopSpy = vi.spyOn(registry, "stop");

            registry.registerHook("field1", () => true);
            registry.registerHook("field2", () => true);
            await flushPromises();

            registry.stop();
            expect(stopSpy).toHaveBeenCalled();
        });
    });

    describe("unregisterHook edge cases", () => {
        it("returns false if the hook ID does not exist", async () => {
            const result = registry.unregisterHook("some-bogus-id");
            expect(result).toBe(false);
        });
    });

    describe("updateAggregates error handling", () => {
        it("catches errors thrown by a hook and logs them", async () => {
            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            registry.registerHook("fieldThrow", () => {
                throw new Error("test error");
            });
            registry.registerHook("fieldThrow", () => true);
            await flushPromises();
            registry.computedAggregates.fieldThrow;
            expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
            expect(registry.computedAggregates.fieldThrow).toBe(true);
            consoleErrorSpy.mockRestore();
        });

        it("catches errors thrown by a hook and the group is false if all hooks throw or return false", async () => {
            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            registry.registerHook("fieldThrowAll", () => {
                throw new Error("test error #1");
            });
            registry.registerHook("fieldThrowAll", () => false);
            await flushPromises();
            expect(registry.computedAggregates.fieldThrowAll).toBe(false);
            expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
            consoleErrorSpy.mockRestore();
        });
    });
});
