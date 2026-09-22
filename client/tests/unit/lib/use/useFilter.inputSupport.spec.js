describe("lib/use/useFilter.js", () => {
    describe("getMissingFilterInputSupport", () => {
        let getMissingFilterInputSupport, mergeFilterFieldMapping;
        beforeEach(async () => {
            vi.resetModules();
            getMissingFilterInputSupport = (await import("@vueda/use/useFilter.js")).getMissingFilterInputSupport;
            mergeFilterFieldMapping = (await import("@vueda/utils/fieldMappings.js")).mergeFilterFieldMapping;
        });

        it("reports nothing missing for a fully mapped plain filter", () => {
            expect(getMissingFilterInputSupport("name", { typeFilter: "CharField" })).toEqual([]);
        });

        it("reports nothing missing for a fully mapped range filter", () => {
            expect(
                getMissingFilterInputSupport("created", {
                    typeFilter: "DateRangeField",
                    suffixes: ["after", "before"],
                }),
            ).toEqual([]);
        });

        it("reports a missing filter type", () => {
            expect(getMissingFilterInputSupport("name", {})).toEqual(["a filter type"]);
        });

        it("reports every missing piece for a type with neither value handling nor components", () => {
            expect(getMissingFilterInputSupport("token", { typeFilter: "UUIDField" })).toEqual([
                'value handling for filter type "UUIDField"',
                'a field component for filter type "UUIDField"',
                'a widget for filter type "UUIDField"',
            ]);
        });

        it("reports the missing components for a type that only has value handling", () => {
            expect(getMissingFilterInputSupport("published", { typeFilter: "DateField" })).toEqual([
                'a field component for filter type "DateField"',
                'a widget for filter type "DateField"',
            ]);
        });

        it("accepts per-field overrides in place of a missing default mapping", () => {
            const CustomWidget = { name: "CustomWidget" };
            expect(
                getMissingFilterInputSupport(
                    "published",
                    { typeFilter: "DateField" },
                    {
                        // A named field component and a function-wrapped widget, the two override
                        // shapes `buildForm` resolves.
                        fieldComponents: { published: "FormField" },
                        widgetComponents: { published: () => CustomWidget },
                    },
                ),
            ).toEqual([]);
        });

        it("accepts named, direct, and function-wrapped components", () => {
            const DirectField = { name: "DirectField" };
            const WrappedWidget = { name: "WrappedWidget" };
            expect(
                getMissingFilterInputSupport(
                    "published",
                    { typeFilter: "DateField" },
                    { fieldComponents: { published: DirectField }, widgetComponents: { published: "WidgetDateField" } },
                ),
            ).toEqual([]);
            expect(
                getMissingFilterInputSupport(
                    "published",
                    { typeFilter: "DateField" },
                    {
                        fieldComponents: { published: "FormField" },
                        widgetComponents: { published: () => WrappedWidget },
                    },
                ),
            ).toEqual([]);
        });

        it("rejects function-wrapped overrides that return no component", () => {
            expect(
                getMissingFilterInputSupport(
                    "name",
                    { typeFilter: "CharField" },
                    { fieldComponents: { name: () => undefined }, widgetComponents: { name: () => undefined } },
                ),
            ).toEqual(['a field component for filter type "CharField"', 'a widget for filter type "CharField"']);
        });

        it.each([
            ["by name", "WidgetUnmapped"],
            ["directly", "direct"],
            ["through a function", "wrapped"],
        ])("rejects the WidgetUnmapped diagnostic given %s", async (_, shape) => {
            const { availableWidgets } = await import("@vueda/utils/formLookups.js");
            const widget = {
                WidgetUnmapped: "WidgetUnmapped",
                direct: availableWidgets.WidgetUnmapped,
                wrapped: () => availableWidgets.WidgetUnmapped,
            }[shape];
            expect(
                getMissingFilterInputSupport(
                    "name",
                    { typeFilter: "CharField" },
                    { widgetComponents: { name: widget } },
                ),
            ).toEqual(['a widget for filter type "CharField"']);
        });

        it("rejects a filter type whose default widget mapping is WidgetUnmapped", () => {
            mergeFilterFieldMapping({
                OpaqueField: { component: "FormField", widget: "WidgetUnmapped", initialValue: null },
            });
            expect(getMissingFilterInputSupport("opaque", { typeFilter: "OpaqueField" })).toEqual([
                'a widget for filter type "OpaqueField"',
            ]);
        });

        it("rejects range boundaries whose overrides resolve no input", () => {
            expect(
                getMissingFilterInputSupport(
                    "created",
                    { typeFilter: "DateRangeField", suffixes: ["after", "before"] },
                    {
                        fieldComponents: { "created.after": () => undefined },
                        widgetComponents: { "created.before": "WidgetUnmapped" },
                    },
                ),
            ).toEqual([
                'a field component for the "after" boundary of filter type "DateRangeField"',
                'a widget for the "before" boundary of filter type "DateRangeField"',
            ]);
        });

        it("rejects a string override that names no registered component", () => {
            expect(
                getMissingFilterInputSupport(
                    "published",
                    { typeFilter: "DateField" },
                    { fieldComponents: { published: "NoSuchField" }, widgetComponents: { published: "NoSuchWidget" } },
                ),
            ).toEqual(['a field component for filter type "DateField"', 'a widget for filter type "DateField"']);
        });

        it("checks each boundary of a range and accepts boundary overrides", () => {
            mergeFilterFieldMapping({
                SpanField: { component: "FieldSetRange", initialValue: { start: null, end: null }, range: true },
            });
            const details = { typeFilter: "SpanField", suffixes: ["min", "max"] };

            expect(getMissingFilterInputSupport("span", details)).toEqual([
                'a field component for the "min" boundary of filter type "SpanField"',
                'a widget for the "min" boundary of filter type "SpanField"',
                'a field component for the "max" boundary of filter type "SpanField"',
                'a widget for the "max" boundary of filter type "SpanField"',
            ]);
            expect(
                getMissingFilterInputSupport("span", details, {
                    fieldComponents: { "span.min": "FormField", "span.max": "FormField" },
                    widgetComponents: { "span.min": "WidgetNumberInput", "span.max": "WidgetNumberInput" },
                }),
            ).toEqual([]);
        });

        it("treats a range type without its two suffixes as a plain input", () => {
            // Without suffixes there are no boundaries to render, so the type needs a widget of its own.
            expect(getMissingFilterInputSupport("created", { typeFilter: "DateRangeField" })).toEqual([
                'a widget for filter type "DateRangeField"',
            ]);
        });
    });
});
