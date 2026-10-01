/**
 * @module .vitepress/theme/fixtures/showcaseDevice
 *
 * Seeded model metadata for the live `ViewSetupDevice` demo on
 * `reference/components/auth-and-mfa.md`.
 *
 * `ViewSetupDevice` takes required `app` and `model` props and reads its method
 * choices from `useModelConfig(...).config.fieldDetails.method.choices`, so it
 * cannot mount without model metadata in the store. Seeding
 * `storeModelInfo.infos[<key>]` lets `storeModelConfig.getConfig` resolve fully
 * offline, the same trick `showcaseCustomer.js` uses for the CRUDL form demos:
 * `fetchModelInfo` short-circuits on the cached entry and the config is built
 * from it.
 *
 * Only the `method` field carries choices, because that is the one field the
 * view drives its own control from. The `destination` field is a plain
 * CharField; the view reveals it conditionally for the email and sms methods.
 */
import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { getAppModelDotName } from "@vueda/utils/case.js";

/** App label and model name the SetupDevice demo passes to `<ViewSetupDevice>`. */
export const SHOWCASE_DEVICE = { app: "showcase", model: "totpdevice" };

/**
 * Device methods, in the `{ label, value }` shape `WidgetSelectDropdown` expects.
 * `storeModelConfig` copies `modelInfo.fields` straight into `fieldDetails`, so
 * these reach the view unchanged.
 */
const methodChoices = [
    { label: "Authenticator app", value: "totp" },
    { label: "Email", value: "email" },
    { label: "SMS", value: "sms" },
];

/**
 * A `ModelInfo` describing a demo two-factor device model, in the camelCased
 * shape the client stores cache after `fetchModelInfo`.
 *
 * @type {import('@vueda/stores/storeModelInfo.js').ModelInfo}
 */
export const deviceModelInfo = {
    appLabel: SHOWCASE_DEVICE.app,
    model: SHOWCASE_DEVICE.model,
    verboseName: "Two-factor device",
    verboseNamePlural: "Two-factor devices",
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
        method: {
            name: "method",
            label: "Method",
            typeDb: "CharField",
            typeModel: "CharField",
            typeSerializer: "ChoiceField",
            many: false,
            readOnly: false,
            required: true,
            choices: methodChoices,
        },
        destination: {
            name: "destination",
            label: "Destination",
            typeDb: "CharField",
            typeModel: "CharField",
            typeSerializer: "CharField",
            many: false,
            readOnly: false,
            required: false,
        },
    },
    actions: [],
    expand: [],
    // No list surface here — ViewSetupDevice reads this metadata for its method choices only — so
    // the server offers nothing to order by and sorts by nothing in particular. Still the object
    // shape `model_ordering` always has, rather than a bare array.
    ordering: { default: [], fields: [] },
    filtering: {},
    permissions: [],
};

/**
 * Seed the demo device metadata into the model-info store so `ViewSetupDevice`
 * can resolve its method choices offline. Idempotent: re-seeding overwrites the
 * same key.
 *
 * @param {import('pinia').Pinia} pinia - The pinia instance the view is mounted against.
 * @returns {void}
 */
export function seedShowcaseDevice(pinia) {
    const infoStore = storeModelInfo(pinia);
    infoStore.infos[getAppModelDotName(SHOWCASE_DEVICE)] = deviceModelInfo;
}
