describe("lib/utils/fieldMappings.js", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it("merges custom mappings into default mappings and returns the merged object", async () => {
        const { mergeDefaultFieldMappings, defaultFieldMappings } = await import("@vueda/utils/fieldMappings.js");
        const customMappings = {
            CustomField: {
                CustomField: { component: "CustomComponent", widget: "CustomWidget" },
            },
        };

        const merged = mergeDefaultFieldMappings(customMappings);

        expect(merged).toBe(defaultFieldMappings);
        expect(defaultFieldMappings.CustomField).toEqual(customMappings.CustomField);
    });

    it("merges custom mappings into filter mappings and returns the merged object", async () => {
        const { mergeFilterFieldMapping, filterFieldMapping } = await import("@vueda/utils/fieldMappings.js");
        // Filter mappings are one level deep, keyed by the filter type the server reports.
        const customMappings = {
            CustomFilterField: { component: "CustomFilterComponent", widget: "CustomFilterWidget" },
        };

        const merged = mergeFilterFieldMapping(customMappings);

        expect(merged).toBe(filterFieldMapping);
        expect(filterFieldMapping.CustomFilterField).toEqual(customMappings.CustomFilterField);
    });

    it("registers a custom filter type's value handling alongside its components", async () => {
        const { mergeFilterFieldMapping, filterFieldMapping, FilterFieldMappings } =
            await import("@vueda/utils/fieldMappings.js");

        mergeFilterFieldMapping({
            SpanField: {
                component: "FieldSetRange",
                boundaryComponent: "FormField",
                boundaryWidget: "WidgetNumberInput",
                initialValue: { start: null, end: null },
                range: true,
            },
        });

        expect(FilterFieldMappings.SpanField).toEqual({ initialValue: { start: null, end: null }, range: true });
        expect(filterFieldMapping.SpanField).toEqual({
            component: "FieldSetRange",
            boundaryComponent: "FormField",
            boundaryWidget: "WidgetNumberInput",
        });
    });

    it("leaves the value table untouched for an entry that only names components", async () => {
        const { mergeFilterFieldMapping, FilterFieldMappings } = await import("@vueda/utils/fieldMappings.js");
        const before = { ...FilterFieldMappings.CharField };

        mergeFilterFieldMapping({ CharField: { widgetProps: { placeholder: "Search" } } });

        expect(FilterFieldMappings.CharField).toEqual(before);
    });

    it("merges custom mappings into many-to-many mappings and returns the merged object", async () => {
        const { mergeManyFieldMappings, manyFieldMappings } = await import("@vueda/utils/fieldMappings.js");
        const customMappings = {
            CustomManyField: {
                CustomManyField: { component: "CustomManyComponent", widget: "CustomManyWidget" },
            },
        };

        const merged = mergeManyFieldMappings(customMappings);

        expect(merged).toBe(manyFieldMappings);
        expect(manyFieldMappings.CustomManyField).toEqual(customMappings.CustomManyField);
    });

    it("maps JSONField to the default JSON widget", async () => {
        const { defaultFieldMappings, manyFieldMappings } = await import("@vueda/utils/fieldMappings.js");
        const { availableWidgets } = await import("@vueda/utils/formLookups.js");

        expect(defaultFieldMappings.JSONField.JSONField.widget).toBe(availableWidgets.WidgetJson);
        expect(manyFieldMappings.JSONField.JSONField.widget).toBe(availableWidgets.WidgetJson);
    });

    it.each(["DateField", "DateTimeField", "TimeField"])(
        "maps a read-only %s to the read-only date widget",
        async (type) => {
            const { defaultFieldMappings } = await import("@vueda/utils/fieldMappings.js");
            const { availableWidgets } = await import("@vueda/utils/formLookups.js");

            expect(defaultFieldMappings[type][type].readOnlyWidget).toBe(availableWidgets.WidgetDateTimeReadOnly);
        },
    );

    it.each(["DateField", "DateTimeField", "TimeField"])(
        "gives a read-only %s the display options its list column uses",
        async (type) => {
            const { defaultFieldMappings } = await import("@vueda/utils/fieldMappings.js");
            const { columnMappings } = await import("@vueda/utils/columnMappings.js");

            // A read view and a list render the same field through the same options, so the
            // two surfaces cannot drift into formatting one value two ways.
            expect(defaultFieldMappings[type][type].readOnlyWidgetProps).toEqual(
                columnMappings[type][type].columnProps,
            );
        },
    );
});
