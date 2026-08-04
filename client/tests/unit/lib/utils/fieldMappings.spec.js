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
        const customMappings = {
            CustomFilterField: {
                CustomFilterField: { component: "CustomFilterComponent", widget: "CustomFilterWidget" },
            },
        };

        const merged = mergeFilterFieldMapping(customMappings);

        expect(merged).toBe(filterFieldMapping);
        expect(filterFieldMapping.CustomFilterField).toEqual(customMappings.CustomFilterField);
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
});
