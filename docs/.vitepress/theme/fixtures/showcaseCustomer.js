/**
 * @module .vitepress/theme/fixtures/showcaseCustomer
 *
 * Seeded model metadata for the Tier A CRUDL demos. The CRUDL view demos render
 * a real {@link FormModel} against this fixture instead of hand-building field
 * markup, so the demo form body stays in lock-step with the framework's actual
 * default output (the source of the earlier `px-6` vs `px-5` gutter drift).
 *
 * Seeding `storeModelInfo.infos[<key>]` directly lets `storeModelConfig.getConfig`
 * resolve fully offline (no backend, no router): `fetchModelInfo` short-circuits on
 * the cached entry and the config is built from it. This module covers metadata only.
 * The full views also need record data, which `ModelDemo` supplies by mocking the
 * `/routes/` endpoints; see `demoApi.js` for the seam and `showcaseRecords.js` for the
 * rows and endpoint builders that pair with the metadata here.
 *
 * Every field here renders a self-contained widget (text, url, static-choice
 * select, decimal, toggle, textarea). No relation/lookup fields are used, so
 * nothing reaches out to a server at render time.
 */
import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { getAppModelDotName } from "@vueda/utils/case.js";

/** App label and model name the demos pass to `<FormModel>` / `<DemoFormModel>`. */
export const SHOWCASE_CUSTOMER = { app: "showcase", model: "customer" };

const ownerChoices = [
    { label: "Mara Tani", value: "mt" },
    { label: "Jordan Reyes", value: "jr" },
    { label: "Priya Subramanian", value: "ps" },
    { label: "Linnea Borg", value: "lb" },
];

const tierChoices = [
    { label: "Trial", value: "trial" },
    { label: "Standard", value: "standard" },
    { label: "Enterprise", value: "enterprise" },
];

const currencyChoices = [
    { label: "USD", value: "usd" },
    { label: "EUR", value: "eur" },
    { label: "GBP", value: "gbp" },
];

/**
 * A `ModelInfo` describing a demo "customer" model, in the camelCased shape the
 * client stores cache after `fetchModelInfo`. Widget selection is driven by each
 * field's `typeSerializer` / `typeModel` pair (and `choices` for selects); see
 * `client/lib/utils/fieldMappings.js`.
 *
 * @type {import('@vueda/stores/storeModelInfo.js').ModelInfo}
 */
export const customerModelInfo = {
    appLabel: SHOWCASE_CUSTOMER.app,
    model: SHOWCASE_CUSTOMER.model,
    // getDefaultFromModelInfo reads the snake_case verbose names; the typedef uses
    // camelCase. Provide both so the built config has a verbose name either way.
    verboseName: "Customer",
    verboseNamePlural: "Customers",
    verbose_name: "Customer",
    verbose_name_plural: "Customers",
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
        account: {
            name: "account",
            label: "Account name",
            typeDb: "CharField",
            typeModel: "CharField",
            typeSerializer: "CharField",
            many: false,
            readOnly: false,
            required: true,
            helpText: "Shown on invoices and the customer portal.",
        },
        domain: {
            name: "domain",
            label: "Primary domain",
            typeDb: "URLField",
            typeModel: "URLField",
            typeSerializer: "URLField",
            many: false,
            readOnly: false,
            required: false,
        },
        owner: {
            name: "owner",
            label: "Owner",
            typeDb: "CharField",
            typeModel: "CharField",
            typeSerializer: "ChoiceField",
            many: false,
            readOnly: false,
            required: true,
            choices: ownerChoices,
        },
        tier: {
            name: "tier",
            label: "Plan tier",
            typeDb: "CharField",
            typeModel: "CharField",
            typeSerializer: "ChoiceField",
            many: false,
            readOnly: false,
            required: false,
            choices: tierChoices,
            helpText: "Default for new accounts is Standard.",
        },
        mrr: {
            name: "mrr",
            label: "MRR",
            typeDb: "DecimalField",
            typeModel: "DecimalField",
            typeSerializer: "DecimalField",
            many: false,
            readOnly: false,
            required: false,
            maxDigits: 10,
            decimalPlaces: 2,
        },
        currency: {
            name: "currency",
            label: "Currency",
            typeDb: "CharField",
            typeModel: "CharField",
            typeSerializer: "ChoiceField",
            many: false,
            readOnly: false,
            required: false,
            choices: currencyChoices,
        },
        taxExempt: {
            name: "taxExempt",
            label: "Tax-exempt",
            typeDb: "BooleanField",
            typeModel: "BooleanField",
            typeSerializer: "BooleanField",
            many: false,
            readOnly: false,
            required: false,
        },
        notes: {
            name: "notes",
            label: "Internal note",
            typeDb: "TextField",
            typeModel: "TextField",
            typeSerializer: "CharField",
            many: false,
            readOnly: false,
            required: false,
            helpText: "Visible to your team only.",
        },
    },
    // DRF action names, matching what `vueda/info/serializers.py` emits: everything
    // except `list` and `create` is a detail action, and `destroy` is the bulk one.
    // `storeModelConfig` derives `routeActions`, `actions`, and `actionDetails` from
    // this list, which is what ViewList reads to decide which toolbar buttons exist.
    actions: [
        { name: "create", description: "create showcase.customer", detail: false, bulk: false, methodNames: ["post"] },
        {
            name: "destroy",
            description: "destroy showcase.customer",
            detail: true,
            bulk: true,
            methodNames: ["delete"],
        },
        { name: "list", description: "list showcase.customer", detail: false, bulk: false, methodNames: ["get"] },
        {
            name: "partial_update",
            description: "partial_update showcase.customer",
            detail: true,
            bulk: false,
            methodNames: ["patch"],
        },
        {
            name: "retrieve",
            description: "retrieve showcase.customer",
            detail: true,
            bulk: false,
            methodNames: ["get"],
        },
        { name: "update", description: "update showcase.customer", detail: true, bulk: false, methodNames: ["put"] },
    ],
    // `ViewHistoryList` builds its columns from the `history` expand's field map, not from
    // `fields`: `modelConfig.info.expand.find(e => e.name === "history").f` (see
    // `client/lib/views/ViewHistoryList.vue`). Without this entry the grid renders no columns
    // at all. `field`, `old`, and `new` are supplied by the view itself.
    expand: [
        {
            name: "history",
            f: Object.fromEntries(
                [
                    ["history_id", "Revision"],
                    ["history_date", "When"],
                    ["history_change_reason", "Reason"],
                    ["history_type", "Type"],
                    ["history_user", "Who"],
                    ["history_relation", "Relation"],
                ].map(([name, label]) => [
                    name,
                    {
                        name,
                        label,
                        typeDb: "CharField",
                        typeModel: "CharField",
                        typeSerializer: "CharField",
                        many: false,
                        readOnly: true,
                        required: false,
                    },
                ]),
            ),
        },
    ],
    // Becomes `config.sortables` / `sortablesDetails`, which is what populates the
    // SortControl add menu. `notes` is deliberately absent: a long free-text column is
    // not something the server offers as an ordering field.
    ordering: [
        { name: "account", type: "alpha" },
        { name: "owner", type: "alpha" },
        { name: "tier", type: "alpha" },
        { name: "mrr", type: "numeric" },
        { name: "currency", type: "alpha" },
        { name: "taxExempt", type: "boolean" },
    ],
    // Becomes `config.filterables` / `filterableDetails`, which is what populates the
    // FilterMenu. Keys are the query-param field names the list endpoint receives.
    filtering: {
        account: {
            label: "Account name",
            fieldClass: "CharFilter",
            inputType: "text",
            typeDb: "CharField",
            typeModel: "CharField",
            typeFilter: "CharField",
            hidden: false,
            required: false,
            lookupExprs: ["icontains", "exact", "istartswith"],
            errorMessages: {},
        },
        owner: {
            label: "Owner",
            fieldClass: "ChoiceFilter",
            inputType: "select",
            typeDb: "CharField",
            typeModel: "CharField",
            typeFilter: "ChoiceField",
            hidden: false,
            required: false,
            choices: ownerChoices,
            lookupExprs: ["exact", "in"],
            errorMessages: {},
        },
        tier: {
            label: "Plan tier",
            fieldClass: "ChoiceFilter",
            inputType: "select",
            typeDb: "CharField",
            typeModel: "CharField",
            typeFilter: "ChoiceField",
            hidden: false,
            required: false,
            choices: tierChoices,
            lookupExprs: ["exact", "in"],
            errorMessages: {},
        },
        mrr: {
            label: "MRR",
            fieldClass: "NumberFilter",
            inputType: "number",
            typeDb: "DecimalField",
            typeModel: "DecimalField",
            typeFilter: "DecimalField",
            hidden: false,
            required: false,
            maxDigits: 10,
            decimalPlaces: 2,
            lookupExprs: ["exact", "gte", "lte"],
            errorMessages: {},
        },
        currency: {
            label: "Currency",
            fieldClass: "ChoiceFilter",
            inputType: "select",
            typeDb: "CharField",
            typeModel: "CharField",
            typeFilter: "ChoiceField",
            hidden: false,
            required: false,
            choices: currencyChoices,
            lookupExprs: ["exact", "in"],
            errorMessages: {},
        },
        taxExempt: {
            label: "Tax-exempt",
            fieldClass: "BooleanFilter",
            inputType: "checkbox",
            typeDb: "BooleanField",
            typeModel: "BooleanField",
            typeFilter: "NullBooleanField",
            hidden: false,
            required: false,
            lookupExprs: ["exact"],
            errorMessages: {},
        },
    },
    permissions: [],
};

/**
 * Seed the demo model metadata into the model-info store so the CRUDL demos can
 * render a real FormModel offline. Idempotent: re-seeding overwrites the same key.
 *
 * @param {import('pinia').Pinia} pinia - The docs app's active pinia instance.
 * @returns {void}
 */
export function seedShowcaseModels(pinia) {
    const infoStore = storeModelInfo(pinia);
    infoStore.infos[getAppModelDotName(SHOWCASE_CUSTOMER)] = customerModelInfo;
}
