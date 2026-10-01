/**
 * @module .vitepress/theme/fixtures/showcaseFieldTypes
 *
 * Seeded model metadata for the Form Widgets page. Each field here exists to make
 * one widget render, so the page shows the real default output for widgets that no
 * other demo reaches.
 *
 * Widget selection comes from a field's `typeSerializer` / `typeModel` pair, plus
 * `choices` and `many`; see `client/lib/utils/fieldMappings.js`. The comment above
 * each field names the widget its pair selects, so a mapping change that moves a
 * field to a different widget shows up here as a demo that no longer matches its
 * caption.
 *
 * Every field resolves offline. The one relation-shaped widget on the page,
 * `WidgetCombobox`, is reached through a many-valued `ChoiceField` carrying static
 * choices rather than a real relation, so nothing fetches at render time.
 */
import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { getAppModelDotName } from "@vueda/utils/case.js";

/** App label and model name the Form Widgets demos pass to `<DemoFormModel>`. */
export const SHOWCASE_FIELD_TYPES = { app: "showcase", model: "fieldtypes" };

const regionChoices = [
    { label: "North America", value: "na" },
    { label: "Europe", value: "eu" },
    { label: "Asia Pacific", value: "apac" },
    { label: "Latin America", value: "latam" },
    { label: "Middle East and Africa", value: "mea" },
];

const expeditedChoices = [
    { label: "Standard handling", value: false },
    { label: "Expedited handling", value: true },
];

/**
 * A `ModelInfo` whose fields cover the widgets the rest of the docs never render.
 *
 * @type {import('@vueda/stores/storeModelInfo.js').ModelInfo}
 */
export const fieldTypesModelInfo = {
    appLabel: SHOWCASE_FIELD_TYPES.app,
    model: SHOWCASE_FIELD_TYPES.model,
    verboseName: "Field type",
    verboseNamePlural: "Field types",
    pk: "id",
    fields: {
        id: {
            name: "id",
            label: "ID",
            typeDb: "AutoField",
            typeModel: "AutoField",
            typeSerializer: "IntegerField",
            many: false,
            readOnly: true,
            required: false,
            pk: true,
        },
        // WidgetDateField, date granularity.
        releaseDate: {
            name: "releaseDate",
            label: "Release date",
            typeDb: "DateField",
            typeModel: "DateField",
            typeSerializer: "DateField",
            many: false,
            readOnly: false,
            required: true,
            helpText: "Segments accept arrow keys; the trigger opens a calendar.",
        },
        // WidgetDateField, minute granularity.
        publishedAt: {
            name: "publishedAt",
            label: "Published at",
            typeDb: "DateTimeField",
            typeModel: "DateTimeField",
            typeSerializer: "DateTimeField",
            many: false,
            readOnly: false,
            required: false,
        },
        // WidgetDateRangeField.
        campaignWindow: {
            name: "campaignWindow",
            label: "Campaign window",
            typeDb: "DateRangeField",
            typeModel: "DateRangeField",
            typeSerializer: "RangeField",
            many: false,
            readOnly: false,
            required: false,
        },
        // WidgetTimeField.
        opensAt: {
            name: "opensAt",
            label: "Opens at",
            typeDb: "TimeField",
            typeModel: "TimeField",
            typeSerializer: "TimeField",
            many: false,
            readOnly: false,
            required: false,
        },
        // WidgetTimeRangeField.
        serviceWindow: {
            name: "serviceWindow",
            label: "Service window",
            typeDb: "TimeRangeField",
            typeModel: "TimeRangeField",
            typeSerializer: "RangeField",
            many: false,
            readOnly: false,
            required: false,
        },
        // WidgetDuration.
        leadTime: {
            name: "leadTime",
            label: "Lead time",
            typeDb: "DurationField",
            typeModel: "DurationField",
            typeSerializer: "DurationField",
            many: false,
            readOnly: false,
            required: false,
            helpText: "Stored as a duration, entered in minutes unless the field asks for more units.",
        },
        // WidgetCombobox, multiple. A many-valued choice field, not a relation, so
        // the options are static and nothing fetches.
        regions: {
            name: "regions",
            label: "Regions",
            typeDb: "CharField",
            typeModel: "CharField",
            typeSerializer: "ChoiceField",
            many: true,
            readOnly: false,
            required: false,
            choices: regionChoices,
        },
        // WidgetRadioGroup. A boolean with choices renders as a radio pair rather
        // than a toggle.
        expedited: {
            name: "expedited",
            label: "Handling",
            typeDb: "BooleanField",
            typeModel: "BooleanField",
            typeSerializer: "BooleanField",
            many: false,
            readOnly: false,
            required: false,
            choices: expeditedChoices,
        },
        // WidgetJson.
        metadata: {
            name: "metadata",
            label: "Metadata",
            typeDb: "JSONField",
            typeModel: "JSONField",
            typeSerializer: "JSONField",
            many: false,
            readOnly: false,
            required: false,
        },
        // WidgetFile.
        datasheet: {
            name: "datasheet",
            label: "Datasheet",
            typeDb: "FileField",
            typeModel: "FileField",
            typeSerializer: "FileField",
            many: false,
            readOnly: false,
            required: false,
        },
        // WidgetImage.
        heroImage: {
            name: "heroImage",
            label: "Hero image",
            typeDb: "ImageField",
            typeModel: "ImageField",
            typeSerializer: "ImageField",
            many: false,
            readOnly: false,
            required: false,
        },
        // WidgetUnmapped: the fallback for a type with no widget of its own.
        serverIp: {
            name: "serverIp",
            label: "Server IP",
            typeDb: "GenericIPAddressField",
            typeModel: "IPAddressField",
            typeSerializer: "IPAddressField",
            many: false,
            readOnly: false,
            required: false,
        },
    },
    actions: [
        {
            name: "create",
            description: "create showcase.fieldtypes",
            detail: false,
            bulk: false,
            methodNames: ["post"],
        },
        { name: "list", description: "list showcase.fieldtypes", detail: false, bulk: false, methodNames: ["get"] },
        {
            name: "retrieve",
            description: "retrieve showcase.fieldtypes",
            detail: true,
            bulk: false,
            methodNames: ["get"],
        },
        {
            name: "update",
            description: "update showcase.fieldtypes",
            detail: true,
            bulk: false,
            methodNames: ["put"],
        },
    ],
    expand: [],
    ordering: { default: ["releaseDate"], fields: [{ name: "releaseDate", type: "date", ascending: true }] },
    filtering: {},
    permissions: [],
};

/**
 * Seed the field-type demo model into the model-info store so the Form Widgets
 * demos resolve their config offline. Idempotent: re-seeding overwrites the key.
 *
 * @param {import('pinia').Pinia} pinia - The docs app's active pinia instance.
 * @returns {void}
 */
export function seedShowcaseFieldTypes(pinia) {
    const infoStore = storeModelInfo(pinia);
    infoStore.infos[getAppModelDotName(SHOWCASE_FIELD_TYPES)] = fieldTypesModelInfo;
}
