import { scopedIt } from "@tests/unit/utils.js";
import { getAppModelDotName } from "@vueda/utils/case.js";
import { createPinia, setActivePinia } from "pinia";

const dummyModelInfo = {
    app_label: "tim",
    model: "timesheet",
    verbose_name: "timesheet",
    verbose_name_plural: "timesheets",
    pk: "id",
    fields: {
        id: {
            choices: false,
            label: "ID",
            many: false,
            read_only: true,
            required: false,
            type_db: "AutoField",
            type_model: "AutoField",
            type_serializer: "IntegerField",
            max_value: 2147483647,
            min_value: -2147483648,
            pk: true,
        },
        name: {
            choices: false,
            label: "Name",
            many: false,
            read_only: false,
            required: true,
            type_db: "CharField",
            type_model: "CharField",
            type_serializer: "CharField",
            max_length: 255,
        },
        description: {
            choices: false,
            label: "Description",
            many: false,
            read_only: false,
            required: false,
            type_db: "TextField",
            type_model: "TextField",
            type_serializer: "CharField",
        },
    },
    actions: [
        {
            name: "create",
            description: "create tim.timesheet",
            detail: false,
            bulk: false,
            methodNames: ["post"],
        },
        {
            name: "destroy",
            description: "destroy tim.timesheet",
            detail: true,
            bulk: true,
            methodNames: ["delete"],
            parameters: ["pk"],
        },
        {
            name: "list",
            description: "list tim.timesheet",
            detail: false,
            bulk: false,
            methodNames: ["get"],
        },
        {
            name: "partialUpdate",
            description: "partial_update tim.timesheet",
            detail: true,
            bulk: false,
            methodNames: ["patch"],
            parameters: ["pk"],
        },
        {
            name: "retrieve",
            description: "retrieve tim.timesheet",
            detail: true,
            bulk: false,
            methodNames: ["get"],
            parameters: ["pk"],
        },
        {
            name: "update",
            description: "update tim.timesheet",
            detail: true,
            bulk: false,
            methodNames: ["put"],
            parameters: ["pk"],
        },
        {
            name: "approve",
            description: "approve tim.timesheet",
            detail: true,
            bulk: true,
            methodNames: ["put"],
            parameters: ["args", "kwargs"],
        },
    ],
    expand: [
        {
            name: "employee",
            readOnly: false,
            many: false,
            appLabel: "empl",
            model: "employee",
            f: {
                id: {
                    choices: false,
                    label: "ID",
                    many: false,
                    readOnly: true,
                    required: false,
                    typeDb: "AutoField",
                    typeModel: "AutoField",
                    typeSerializer: "IntegerField",
                    maxValue: 2147483647,
                    minValue: -2147483648,
                    pk: true,
                },
                username: {
                    choices: false,
                    label: "Username",
                    many: false,
                    readOnly: false,
                    required: true,
                    typeDb: "CharField",
                    typeModel: "CharField",
                    typeSerializer: "CharField",
                    maxLength: 150,
                },
                email: {
                    choices: false,
                    label: "Email",
                    many: false,
                    readOnly: false,
                    required: true,
                    typeDb: "EmailField",
                    typeModel: "EmailField",
                    typeSerializer: "EmailField",
                },
            },
        },
        {
            name: "timesheet_days",
            readOnly: false,
            many: true,
            appLabel: "tim",
            model: "timesheetday",
            f: {
                id: {
                    choices: false,
                    label: "ID",
                    many: false,
                    readOnly: true,
                    required: false,
                    typeDb: "AutoField",
                    typeModel: "AutoField",
                    typeSerializer: "IntegerField",
                    maxValue: 2147483647,
                    minValue: -2147483648,
                    pk: true,
                },
                day: {
                    choices: false,
                    label: "Day",
                    many: false,
                    readOnly: false,
                    required: true,
                    typeDb: "DateField",
                    typeModel: "DateField",
                    typeSerializer: "DateField",
                },
            },
        },
    ],
    ordering: {
        default: ["week_start", "employee.last_name"],
        fields: [
            { name: "week_start", type: "date", ascending: false },
            { name: "employee.last_name", type: "alpha", ascending: true },
            { name: "employee.first_name", type: "alpha" },
        ],
    },
    filtering: {
        name: {
            label: "Name",
            fieldClass: "CharFilter",
            inputType: "text",
            lookupExprs: ["icontains", "exact"],
        },
    },
    permissions: [
        { codename: "activate_timesheet", name: "Can activate timesheet" },
        { codename: "add_timesheet", name: "Can add timesheet" },
        { codename: "view_timesheet", name: "Can view timesheet" },
    ],
    methods: ["get", "post", "put", "patch", "delete"],
    required_fields: ["name"],
    description: "A test timesheet model.",
    read_only: false,
    abstract: false,
};

describe("lib/stores/storeModelConfig.js", () => {
    let mockedFetchModelInfo, storeModelConfigModule, storeModelConfig, AuthScopeInvalidatedError;
    beforeEach(async () => {
        // Reset Pinia before each test.
        setActivePinia(createPinia());
        mockedFetchModelInfo = vi.fn();
        mockedFetchModelInfo.mockResolvedValue(dummyModelInfo);
        vi.doMock("@vueda/stores/storeModelInfo.js", () => ({
            storeModelInfo: () => ({
                fetchModelInfo: mockedFetchModelInfo,
            }),
        }));

        storeModelConfigModule = await import("@vueda/stores/storeModelConfig.js");
        storeModelConfig = storeModelConfigModule.storeModelConfig;
        ({ AuthScopeInvalidatedError } = await import("@vueda/utils/errors.js"));
    });
    afterEach(() => {
        vi.resetAllMocks();
        vi.resetModules();
    });

    describe("getConfig", () => {
        scopedIt("builds a default config from modelInfo with flattened expansion details", async () => {
            const store = storeModelConfig();
            // Clear any caches.
            store.builtConfigs = {};
            store.initialized = {};

            const config = await store.getConfig({ app: "testApp", model: "testModel" });
            const genericKey = getAppModelDotName({ app: "testApp", model: "testModel" });

            expect(config.verboseName).toBe("timesheet");
            expect(config.verboseNamePlural).toBe("timesheets");
            expect(config.displayFields).toEqual(["name", "description"]);
            expect(config.fetchFields).toEqual(["name", "description"]);
            expect(config.submitFields).toEqual(["name", "description"]);

            expect(config.expand).toEqual(["employee", "timesheet_days"]);
            expect(config.routeActions).toEqual([
                "create",
                "destroy",
                "list",
                "partialUpdate",
                "retrieve",
                "update",
                "approve",
            ]);
            expect(config.actions).toEqual([
                "create",
                "destroy",
                "list",
                "partialUpdate",
                "retrieve",
                "update",
                "approve",
            ]);

            // Filtering and ordering
            expect(config.filterables).toEqual(["name"]);
            expect(config.sortables).toEqual(["week_start", "employee.last_name", "employee.first_name"]);
            expect(config.sorted).toEqual(["-week_start", "employee.last_name"]);

            expect(config.fieldDetails).toHaveProperty("id");
            expect(config.fieldDetails).toHaveProperty("name");
            expect(config.fieldDetails).toHaveProperty("description");

            expect(config.fieldDetails).toHaveProperty("employee");
            expect(config.fieldDetails).toHaveProperty("employee.id");
            expect(config.fieldDetails).toHaveProperty("employee.username");
            expect(config.fieldDetails).toHaveProperty("employee.email");

            expect(config.fieldDetails).toHaveProperty("timesheet_days");
            expect(config.fieldDetails).toHaveProperty("timesheet_days.id");
            expect(config.fieldDetails).toHaveProperty("timesheet_days.day");

            expect(config.expandDetails).toHaveProperty("employee");
            expect(config.expandDetails).toHaveProperty("timesheet_days");

            expect(Object.keys(config.actionDetails)).toEqual(
                expect.arrayContaining(["create", "destroy", "list", "partialUpdate", "retrieve", "update", "approve"]),
            );

            expect(config.filterableDetails).toEqual(dummyModelInfo.filtering);
            expect(config.sortablesDetails).toEqual(dummyModelInfo.ordering.fields);

            expect(config.actionRedirects.default).toBe("update");

            expect(config.formProps).toEqual({});
            expect(config).not.toHaveProperty("allowShowAllPages");
            expect(config).not.toHaveProperty("alwaysShowAllPages");
            expect(config.fieldComponents).toEqual({});
            expect(config.fieldProps).toEqual({});
            expect(config.widgetComponents).toEqual({});
            expect(config.widgetProps).toEqual({});

            expect(store.builtConfigs).toHaveProperty(genericKey);
        });

        scopedIt("throws an error if app or model is missing", async () => {
            const store = storeModelConfig();
            await expect(store.getConfig({ app: null, model: "testModel" })).rejects.toThrow();
            await expect(() => store.setConfig({ app: "", model: "testModel" })).toThrow();
        });

        scopedIt("handles incomplete modelInfo data gracefully", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            const incompleteModelInfo = {
                verbose_name: "Incomplete Model",
                verbose_name_plural: "Incomplete Models",
            };

            mockedFetchModelInfo.mockResolvedValue(incompleteModelInfo);

            const config = await store.getConfig({ app: "incompleteApp", model: "incompleteModel" });
            expect(config).toEqual({
                formProps: {},
                fieldComponents: {},
                fieldProps: {},
                widgetComponents: {},
                widgetProps: {},
                columnComponents: {},
                columnProps: {},
                actionRedirects: {},
                actionDetails: {},
                fieldDetails: {},
                filterableDetails: {},
                sortableDetails: {},
            });
        });

        scopedIt("handles errors from fetchModelInfo", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            const errorMessage = "Simulated error fetching model info";
            mockedFetchModelInfo.mockRejectedValue(new Error(errorMessage));

            await expect(store.getConfig({ app: "errorApp", model: "errorModel" })).rejects.toThrow(errorMessage);
        });

        scopedIt.for([
            { actions: ["retrieve", "list"], expected: "read" },
            { actions: ["list"], expected: "list" },
            { actions: [], expected: null },
        ])("sets default redirect based on available actions", async ({ actions, expected }) => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            const customModelInfo = JSON.parse(JSON.stringify(dummyModelInfo));
            customModelInfo.actions = customModelInfo.actions.filter((a) => actions.includes(a.name));
            mockedFetchModelInfo.mockResolvedValue(customModelInfo);

            const config = await store.getConfig({ app: "testApp", model: "testModel" });
            expect(config.actionRedirects.default).toBe(expected);
        });

        scopedIt("uses empty filter and sort info when not provided", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            const customModelInfo = JSON.parse(JSON.stringify(dummyModelInfo));
            delete customModelInfo.filtering;
            delete customModelInfo.ordering;
            mockedFetchModelInfo.mockResolvedValue(customModelInfo);

            const config = await store.getConfig({ app: "testApp", model: "testModel" });
            expect(config.filterables).toEqual([]);
            expect(config.sortables).toEqual([]);
            expect(config.sorted).toEqual([]);
        });

        scopedIt("derives the default sort from ordering.default, honoring each field's ascending flag", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            const customModelInfo = JSON.parse(JSON.stringify(dummyModelInfo));
            customModelInfo.ordering = {
                default: ["employee.first_name", "week_start"],
                fields: [
                    { name: "week_start", type: "date", ascending: false },
                    { name: "employee.first_name", type: "alpha", ascending: true },
                    { name: "employee.last_name", type: "alpha" },
                ],
            };
            mockedFetchModelInfo.mockResolvedValue(customModelInfo);

            const config = await store.getConfig({ app: "testApp", model: "testModel" });
            // Priority order follows `default`; direction follows each field's `ascending`.
            expect(config.sorted).toEqual(["employee.first_name", "-week_start"]);
        });

        scopedIt(
            "logs an error and assumes ascending when a default sort field has no boolean ascending flag",
            async () => {
                const store = storeModelConfig();
                store.builtConfigs = {};
                store.initialized = {};
                const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

                const customModelInfo = JSON.parse(JSON.stringify(dummyModelInfo));
                customModelInfo.ordering = {
                    default: ["employee.last_name"],
                    // `ascending` is only ever omitted by the server for fields that aren't
                    // in `default`; a `default` entry missing it is a server contract bug.
                    fields: [{ name: "employee.last_name", type: "alpha" }],
                };
                mockedFetchModelInfo.mockResolvedValue(customModelInfo);

                const config = await store.getConfig({ app: "testApp", model: "testModel" });
                expect(config.sorted).toEqual(["employee.last_name"]);
                expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("employee.last_name"));

                consoleError.mockRestore();
            },
        );

        scopedIt(
            "logs an error and assumes ascending when a default sort field has no matching ordering.fields entry",
            async () => {
                const store = storeModelConfig();
                store.builtConfigs = {};
                store.initialized = {};
                const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

                const customModelInfo = JSON.parse(JSON.stringify(dummyModelInfo));
                customModelInfo.ordering = {
                    default: ["not_a_real_field"],
                    fields: [{ name: "week_start", type: "date", ascending: false }],
                };
                mockedFetchModelInfo.mockResolvedValue(customModelInfo);

                const config = await store.getConfig({ app: "testApp", model: "testModel" });
                expect(config.sorted).toEqual(["not_a_real_field"]);
                expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("not_a_real_field"));

                consoleError.mockRestore();
            },
        );

        scopedIt("exposes the primary key via fieldDetails", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            const customModelInfo = JSON.parse(JSON.stringify(dummyModelInfo));
            customModelInfo.pk = "uuid";
            customModelInfo.fields.id.pk = false;
            customModelInfo.fields.uuid = {
                ...customModelInfo.fields.id,
                label: "UUID",
                pk: true,
            };
            mockedFetchModelInfo.mockResolvedValue(customModelInfo);

            const config = await store.getConfig({ app: "testApp", model: "testModel" });
            expect(config.fieldDetails.uuid.pk).toBe(true);
            expect(config.displayFields).not.toContain("uuid");

            const foundPk = Object.keys(config.fieldDetails).find((f) => config.fieldDetails[f].pk);
            expect(foundPk).toBe("uuid");
        });
    });

    describe("setConfig and config merging", () => {
        scopedIt("applies generic custom config overrides", async () => {
            const store = storeModelConfig();
            // Clear caches
            store.builtConfigs = {};
            store.initialized = {};

            const genericKey = getAppModelDotName({ app: "testApp", model: "testModel" });
            const customGenericConfig = {
                verboseName: "Custom Timesheet",
                displayFields: ["name"],
                formProps: { custom: true },
            };
            store.setConfig({ app: "testApp", model: "testModel" }, customGenericConfig);

            const config = await store.getConfig({ app: "testApp", model: "testModel" });
            expect(config.verboseName).toBe("Custom Timesheet");
            expect(config.displayFields).toEqual(["name"]);
            expect(config.formProps).toEqual({ custom: true });
            expect(store.builtConfigs).toHaveProperty(genericKey);
        });

        scopedIt("applies view-specific custom config overrides", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            const customGenericConfig = {
                submitFields: ["name", "description"],
                widgetProps: { default: { size: "medium" } },
            };
            const customSpecificConfig = {
                submitFields: ["description"],
                widgetProps: { default: { color: "blue" } },
            };
            store.setConfig({ app: "testApp", model: "testModel" }, customGenericConfig, {
                update: customSpecificConfig,
            });

            const config = await store.getConfig({ app: "testApp", model: "testModel", view: "update" });

            expect(config.submitFields).toEqual(["description"]);

            expect(config.widgetProps.default).toEqual({ size: "medium", color: "blue" });
        });

        scopedIt("merges shallow and deep properties correctly", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            const customGenericConfig = {
                fieldComponents: { name: { component: "GenericNameField" } },
                fieldDetails: { name: { label: "Generic Name" } },
            };
            const customSpecificConfig = {
                fieldComponents: { name: { extraProp: "specific" } },
                fieldDetails: {
                    name: {
                        label: "Specific Name",
                        extra: true,
                    },
                },
            };
            store.setConfig({ app: "testApp", model: "testModel" }, customGenericConfig, {
                update: customSpecificConfig,
            });

            const config = await store.getConfig({ app: "testApp", model: "testModel", view: "update" });
            expect(config.fieldComponents.name).toEqual({
                component: "GenericNameField",
                extraProp: "specific",
            });
            expect(config.fieldDetails.name).toEqual({
                choices: false,
                extra: true,
                label: "Specific Name",
                many: false,
                max_length: 255,
                read_only: false,
                required: true,
                type_db: "CharField",
                type_model: "CharField",
                type_serializer: "CharField",
            });
        });

        scopedIt("merges columnComponents (shallow) and columnProps (deep) across configs", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            const customGenericConfig = {
                columnComponents: { name: "ColumnText", category: "ColumnModelLink" },
                columnProps: { category: { app: "catalog", view: "read" } },
            };
            const customSpecificConfig = {
                columnComponents: { category: "ColumnText" },
                columnProps: { category: { model: "widgetcategory" } },
            };
            store.setConfig({ app: "testApp", model: "testModel" }, customGenericConfig, {
                update: customSpecificConfig,
            });

            const config = await store.getConfig({ app: "testApp", model: "testModel", view: "update" });
            // shallow: per-field entries from both configs are present; the
            // view-specific value replaces the generic one for the same field.
            expect(config.columnComponents).toEqual({ name: "ColumnText", category: "ColumnText" });
            // deep: per-field prop objects merge key-by-key.
            expect(config.columnProps.category).toEqual({ app: "catalog", view: "read", model: "widgetcategory" });
        });

        scopedIt("flattens expansion details and applies custom overrides", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            const customGenericConfig = {
                expandDetails: {
                    employee: {
                        extra: "generic",
                        f: {
                            username: { label: "Generic Username" },
                        },
                    },
                },
                fieldDetails: {
                    "employee.username": { placeholder: "Enter username" },
                },
            };
            const customSpecificConfig = {
                expandDetails: {
                    employee: {
                        extra: "specific",
                        f: {
                            username: { label: "Specific Username" },
                        },
                    },
                },
                fieldDetails: {
                    "employee.username": { placeholder: "Specific placeholder" },
                },
            };

            store.setConfig({ app: "testApp", model: "testModel" }, customGenericConfig, {
                update: customSpecificConfig,
            });

            const config = await store.getConfig({ app: "testApp", model: "testModel", view: "update" });

            expect(config.expandDetails.employee.extra).toBe("specific");

            expect(config.fieldDetails["employee.username"].label).toBe("Specific Username");
            expect(config.fieldDetails["employee.username"].placeholder).toBe("Specific placeholder");
        });

        scopedIt("supports null specific config entries", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            store.setConfig({ app: "testApp", model: "testModel" }, null, { update: null });

            const config = await store.getConfig({ app: "testApp", model: "testModel", view: "update" });
            expect(config.verboseName).toBe("timesheet");
        });

        scopedIt("falls back to default field lists when overrides provide empty arrays", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            store.setConfig(
                { app: "testApp", model: "testModel" },
                {
                    displayFields: [],
                    fetchFields: [],
                    submitFields: [],
                },
            );

            const config = await store.getConfig({ app: "testApp", model: "testModel" });
            expect(config.displayFields).toEqual(["name", "description"]);
            expect(config.fetchFields).toEqual(["name", "description"]);
            expect(config.submitFields).toEqual(["name", "description"]);
        });

        scopedIt("returns no expansion fields when expand array is empty", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            store.setConfig({ app: "testApp", model: "testModel" }, { expand: [] });

            const config = await store.getConfig({ app: "testApp", model: "testModel" });
            expect(config.expand).toEqual([]);
            expect(config.fieldDetails).not.toHaveProperty("employee");
            expect(config.fieldDetails).not.toHaveProperty("timesheet_days");
        });

        scopedIt("handles expansions lacking sub-field info", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            const customModelInfo = JSON.parse(JSON.stringify(dummyModelInfo));
            delete customModelInfo.expand[0].f;
            mockedFetchModelInfo.mockResolvedValue(customModelInfo);

            const config = await store.getConfig({ app: "testApp", model: "testModel" });
            expect(config.fieldDetails).toHaveProperty("employee");
            expect(config.fieldDetails).not.toHaveProperty("employee.id");
        });
    });

    describe("submitFields validation", () => {
        scopedIt("rejects a submitFields entry that names an expand-flattened display field", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            store.setConfig({ app: "testApp", model: "testModel" }, { submitFields: ["name", "employee.username"] });

            await expect(store.getConfig({ app: "testApp", model: "testModel" })).rejects.toThrow(
                /submitFields for testApp\.testModel names expand-flattened display field\(s\): employee\.username/,
            );
        });

        scopedIt("drops an expand-flattened field the fields shorthand names, rather than rejecting", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            store.setConfig({ app: "testApp", model: "testModel" }, { fields: ["name", "employee.username"] });

            const config = await store.getConfig({ app: "testApp", model: "testModel" });
            expect(config.displayFields).toEqual(["name", "employee.username"]);
            expect(config.fetchFields).toEqual(["name", "employee.username"]);
            expect(config.submitFields).toEqual(["name"]);
        });

        scopedIt("builds a list config from a fields shorthand naming an expand-flattened field", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            store.setConfig({ app: "testApp", model: "testModel" }, { fields: ["name", "employee.username"] });

            const config = await store.getConfig({ app: "testApp", model: "testModel", view: "list" });
            expect(config.displayFields).toEqual(["name", "employee.username"]);
            expect(config.submitFields).toEqual(["name"]);
        });

        scopedIt("builds a read config from a fields shorthand naming an expand-flattened field", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            store.setConfig({ app: "testApp", model: "testModel" }, { fields: ["name", "employee.username"] });

            const config = await store.getConfig({ app: "testApp", model: "testModel", view: "read" });
            expect(config.displayFields).toEqual(["name", "employee.username"]);
            expect(config.submitFields).toEqual(["name"]);
        });

        scopedIt("still rejects an explicitly declared submitFields entry naming a flattened field", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            store.setConfig(
                { app: "testApp", model: "testModel" },
                { fields: ["name"], submitFields: ["name", "employee.username"] },
            );

            await expect(store.getConfig({ app: "testApp", model: "testModel" })).rejects.toThrow(
                /submitFields for testApp\.testModel names expand-flattened display field\(s\): employee\.username/,
            );
        });

        scopedIt("allows the same expand-flattened field in displayFields and fetchFields", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            store.setConfig(
                { app: "testApp", model: "testModel" },
                {
                    displayFields: ["name", "employee.username"],
                    fetchFields: ["name", "employee.username"],
                    submitFields: ["name"],
                },
            );

            const config = await store.getConfig({ app: "testApp", model: "testModel" });
            expect(config.displayFields).toEqual(["name", "employee.username"]);
            expect(config.fetchFields).toEqual(["name", "employee.username"]);
            expect(config.submitFields).toEqual(["name"]);
        });
    });

    describe("Caching and concurrency", () => {
        scopedIt("caches the built configuration", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            await store.getConfig({ app: "testApp", model: "testModel" });
            const genericKey = getAppModelDotName({ app: "testApp", model: "testModel" });
            store.builtConfigs[genericKey].customCacheTest = true;
            const config2 = await store.getConfig({ app: "testApp", model: "testModel" });
            expect(config2.customCacheTest).toBe(true);
        });

        scopedIt("invalidates cache after updating configuration with setConfig", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            const config1 = await store.getConfig({ app: "testApp", model: "testModel" });
            expect(config1.verboseName).toBe("timesheet");

            const customGenericConfig = {
                verboseName: "Updated Timesheet",
            };
            store.setConfig({ app: "testApp", model: "testModel" }, customGenericConfig);

            const config2 = await store.getConfig({ app: "testApp", model: "testModel" });
            expect(config2.verboseName).toBe("Updated Timesheet");
        });

        scopedIt("returns the same promise for concurrent getConfig calls", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            const promise1 = store.getConfig({ app: "testApp", model: "testModel" });
            const promise2 = store.getConfig({ app: "testApp", model: "testModel" });
            const config1 = await promise1;
            const config2 = await promise2;
            expect(config1).toBe(config2);
        });

        scopedIt("caches fetch failures so subsequent getConfig calls return the same error", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            mockedFetchModelInfo.mockRejectedValueOnce(new Error("Fetch error"));

            await expect(store.getConfig({ app: "testApp", model: "testModel" })).rejects.toThrow("Fetch error");

            expect(store.initialized).toHaveProperty(getAppModelDotName({ app: "testApp", model: "testModel" }));

            await expect(store.getConfig({ app: "testApp", model: "testModel" })).rejects.toThrow("Fetch error");

            expect(mockedFetchModelInfo).toHaveBeenCalledTimes(1);
        });

        scopedIt("does not apply setConfig if a config is in flight", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            let resolveFetch;
            const delayedPromise = new Promise((resolve) => {
                resolveFetch = resolve;
            });
            mockedFetchModelInfo.mockReturnValue(delayedPromise);

            const inFlightPromise = store.getConfig({ app: "testApp", model: "testModel" });

            store.setConfig({ app: "testApp", model: "testModel" }, { verboseName: "Updated Timesheet" });

            resolveFetch(dummyModelInfo);
            const config = await inFlightPromise;
            expect(config.verboseName).toBe("timesheet");
        });

        scopedIt("cancels the in-flight promise when setConfig is called", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            const cancellablePromise = new Promise(() => {});
            const cancelMock = vi.fn();
            cancellablePromise.cancel = cancelMock;

            mockedFetchModelInfo.mockReturnValue(cancellablePromise);

            store.getConfig({ app: "testApp", model: "testModel" });

            store.setConfig({ app: "testApp", model: "testModel" }, { verboseName: "Updated Timesheet" });

            expect(cancelMock).toHaveBeenCalled();

            expect(store.initialized).not.toHaveProperty(getAppModelDotName({ app: "testApp", model: "testModel" }));
        });
    });
    describe("clearAuthScoped", () => {
        scopedIt("empties builtConfigs and initialized but keeps the integrator's own configs", async () => {
            const store = storeModelConfig();
            store.setConfig(
                { app: "testApp", model: "testModel" },
                { verboseName: "Mine" },
                { list: { sorted: ["name"] } },
            );
            await store.getConfig({ app: "testApp", model: "testModel" });

            const genericKey = getAppModelDotName({ app: "testApp", model: "testModel" });
            expect(store.builtConfigs[genericKey]).toBeDefined();

            store.clearAuthScoped();

            expect(store.builtConfigs).toEqual({});
            expect(store.initialized).toEqual({});
            expect(store.genericConfigs[genericKey]).toEqual({ verboseName: "Mine" });
            expect(store.specificConfigs[`${genericKey}-list`]).toEqual({ sorted: ["name"] });
        });

        scopedIt("cancels in-flight builds", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            const cancellablePromise = new Promise(() => {});
            const cancelMock = vi.fn();
            cancellablePromise.cancel = cancelMock;
            mockedFetchModelInfo.mockReturnValue(cancellablePromise);

            store.getConfig({ app: "testApp", model: "testModel" });
            expect(store.initialized).toHaveProperty(getAppModelDotName({ app: "testApp", model: "testModel" }));

            store.clearAuthScoped();

            expect(cancelMock).toHaveBeenCalled();
            expect(store.initialized).toEqual({});
        });

        scopedIt("writes nothing when a build finishes after the clear", async () => {
            const store = storeModelConfig();
            store.builtConfigs = {};
            store.initialized = {};

            let resolveFetch;
            mockedFetchModelInfo.mockReturnValue(
                new Promise((resolve) => {
                    resolveFetch = resolve;
                }),
            );

            const inFlight = store.getConfig({ app: "testApp", model: "testModel" });
            store.clearAuthScoped();
            resolveFetch(dummyModelInfo);

            await expect(inFlight).rejects.toThrow(AuthScopeInvalidatedError);
            expect(store.builtConfigs).toEqual({});

            mockedFetchModelInfo.mockResolvedValue(dummyModelInfo);
            const rebuilt = await store.getConfig({ app: "testApp", model: "testModel" });
            expect(rebuilt.verboseName).toBe("timesheet");
        });
    });
});
