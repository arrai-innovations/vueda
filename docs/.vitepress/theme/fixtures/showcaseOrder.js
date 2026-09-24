/**
 * @module .vitepress/theme/fixtures/showcaseOrder
 *
 * Seeded metadata and endpoints for the order demo in the Configure CRUDL Views guide. The
 * demo shows the three field lists doing separate jobs: the form renders and submits
 * `quantity`, while a custom summary reads the server-calculated `unit_price` and `total`.
 *
 * Unlike the customer fixtures, the update endpoint here keeps what it receives, so the
 * view's retrieval after a save shows the recalculated total. It also answers only the
 * fields the request's `f` parameter names, as the server does, and records every
 * request so the page can show what each save sent.
 */
import { demoResponse } from "./demoApi.js";
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";
import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { getAppModelDotName } from "@vueda/utils/case.js";
import { reactive } from "vue";

const MODEL = "order";

const AVAILABLE_ACTIONS = ["retrieve", "update"];

/** The field lists the demo configures, as an integrator would at bootstrap. */
export const ORDER_FIELD_CONFIG = {
    displayFields: ["quantity"],
    fetchFields: ["quantity", "unit_price", "total"],
    submitFields: ["quantity"],
};

/**
 * @param {string} app - App label the model is registered under.
 * @returns {import('@vueda/stores/storeModelInfo.js').ModelInfo}
 */
function orderModelInfo(app) {
    return {
        appLabel: app,
        model: MODEL,
        verboseName: "Order",
        verboseNamePlural: "Orders",
        verbose_name: "Order",
        verbose_name_plural: "Orders",
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
            quantity: {
                name: "quantity",
                label: "Quantity",
                typeDb: "IntegerField",
                typeModel: "IntegerField",
                typeSerializer: "IntegerField",
                many: false,
                readOnly: false,
                required: true,
            },
            unit_price: {
                name: "unit_price",
                label: "Unit price",
                typeDb: "DecimalField",
                typeModel: "DecimalField",
                typeSerializer: "DecimalField",
                many: false,
                readOnly: true,
                required: false,
                maxDigits: 10,
                decimalPlaces: 2,
            },
            total: {
                name: "total",
                label: "Total",
                typeDb: "DecimalField",
                typeModel: "DecimalField",
                typeSerializer: "DecimalField",
                many: false,
                readOnly: true,
                required: false,
                maxDigits: 10,
                decimalPlaces: 2,
            },
        },
        actions: [
            {
                name: "retrieve",
                description: `retrieve ${app}.${MODEL}`,
                detail: true,
                bulk: false,
                methodNames: ["get"],
            },
            { name: "update", description: `update ${app}.${MODEL}`, detail: true, bulk: false, methodNames: ["put"] },
        ],
        expand: [],
        ordering: { default: [], fields: [] },
        filtering: {},
    };
}

/**
 * Answer only the fields the request's `f` parameter names, plus the PK.
 *
 * @param {object} record - The stored row.
 * @param {URLSearchParams} query - The request query string.
 * @returns {object} The response body.
 */
function selectFields(record, query) {
    const row = { ...record, available_actions: AVAILABLE_ACTIONS };
    const requested = query.get("f");
    if (!requested) {
        return row;
    }
    const names = new Set(["id", ...requested.split(",")]);
    return Object.fromEntries(Object.entries(row).filter(([name]) => names.has(name)));
}

/**
 * Build the matched `seed` / `api` pair for the order demo, plus the log of requests it
 * has answered.
 *
 * @param {object} [options]
 * @param {string} [options.app] - App label the demo mounts under.
 * @returns {{ app: string, model: string, seed: Function, api: object[], requests: object[] }}
 */
export function orderScenario({ app = "showcaseorder" } = {}) {
    const unitPrice = "4.25";
    const record = { id: 1, quantity: 2, unit_price: unitPrice, total: "8.50" };
    /** @type {{ method: string, fields: string, body: object|undefined }[]} */
    const requests = reactive([]);
    const scope = `^/routes/${app}/${MODEL}/(?<pk>[^/]+)/$`;
    const log = ({ method, query, body }) => requests.push({ method, fields: query.get("f") ?? "", body });

    return {
        app,
        model: MODEL,
        requests,
        seed: (pinia) => {
            storeModelInfo(pinia).infos[getAppModelDotName({ app, model: MODEL })] = orderModelInfo(app);
            storeModelConfig(pinia).setConfig({ app, model: MODEL }, ORDER_FIELD_CONFIG);
        },
        api: [
            {
                // ViewUpdate asks which workflow transitions the model offers; an order has none.
                method: "GET",
                path: new RegExp(`^/routes/vueda\\.workflow/workflows/${app}/${MODEL}/permitted_transitions/$`),
                handler: () => [],
            },
            {
                method: "GET",
                path: new RegExp(scope),
                handler: (context) => {
                    log(context);
                    return selectFields(record, context.query);
                },
            },
            {
                // The server ignores read-only input and recalculates the total from the quantity.
                method: "PUT",
                path: new RegExp(scope),
                handler: (context) => {
                    log(context);
                    const quantity = Number(context.body?.quantity);
                    if (!Number.isInteger(quantity) || quantity < 1) {
                        return demoResponse(400, { quantity: ["Enter a whole number of at least 1."] });
                    }
                    record.quantity = quantity;
                    record.total = (quantity * Number(unitPrice)).toFixed(2);
                    return selectFields(record, context.query);
                },
            },
        ],
    };
}
