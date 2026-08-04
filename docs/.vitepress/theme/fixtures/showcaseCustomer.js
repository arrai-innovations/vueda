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
 * the cached entry and the config is built from it. See the data-adapter seam note
 * (`docs/temp/view-data-adapter-seam.md`) for why the full views still need a live
 * backend while a standalone FormModel does not.
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
    actions: [],
    expand: [],
    ordering: [],
    filtering: {},
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
