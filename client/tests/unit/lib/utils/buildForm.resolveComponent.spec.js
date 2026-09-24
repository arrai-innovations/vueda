describe("lib/utils/buildForm.js", () => {
    describe("resolveComponent", () => {
        let resolveComponent;
        const Named = { name: "Named" };
        const Direct = { name: "Direct" };
        const Wrapped = { name: "Wrapped" };
        const lookup = { Named };
        const context = { kind: "widget", fieldName: "name", app: "app", model: "model" };
        beforeEach(async () => {
            resolveComponent = (await import("@vueda/utils/buildForm.js")).resolveComponent;
        });

        it("resolves a named, direct, or function-wrapped component", () => {
            expect(resolveComponent("Named", lookup, context)).toBe(Named);
            expect(resolveComponent(Direct, lookup, context)).toBe(Direct);
            expect(resolveComponent(() => Wrapped, lookup, context)).toBe(Wrapped);
        });

        it("throws for an absent reference or a name missing from the lookup", () => {
            expect(() => resolveComponent(undefined, lookup, context)).toThrow(
                'No widget component found for field "name" in app "app" model "model"',
            );
            expect(() => resolveComponent("Missing", lookup, context)).toThrow(
                'No widget component named "Missing" for field "name" in app "app" model "model"',
            );
        });

        it("throws for a function that returns no component", () => {
            expect(() => resolveComponent(() => undefined, lookup, context)).toThrow(
                'No widget component returned by the function configured for field "name" in app "app" model "model"',
            );
        });
    });
});
