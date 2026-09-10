/**
 * @module .vitepress/theme/fixtures/showcaseRecords
 *
 * Record data and endpoint builders for the live view demos, paired with the model
 * metadata in `showcaseCustomer.js`.
 *
 * `ModelDemo` mocks `fetch`, so these builders answer the same endpoints a Django
 * backend would: the DRF-shaped list envelope, detail retrieve, delete, and object
 * history. The list endpoint applies search, ordering, filtering, and pagination to the
 * fixture rows rather than returning them verbatim, so the demos exercise the real
 * toolbar wiring (`SortControl`, `FilterGroup`, `PaginationFooter`) end to end instead
 * of showing a frozen page one.
 *
 * Record keys are the camelCase field names from `customerModelInfo.fields`, not the
 * snake_case a server emits: `storeModelInfo` camelCases model info on fetch, but the
 * list adaptor pushes `results` through untouched, so rows and field names have to
 * already agree.
 *
 * Two demos that need different responses for the same model must be built under
 * different app labels; route registration is global and first-match-wins (see
 * `demoApi.js`). `customerScenario({ app })` exists for exactly that.
 */
import { demoResponse } from "./demoApi.js";
import { SHOWCASE_CUSTOMER, customerModelInfo } from "./showcaseCustomer.js";
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";
import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { getAppModelDotName } from "@vueda/utils/case.js";
import {
    DEFAULT_PAGE_SIZE,
    ORDERING_PARAM,
    PAGE_PARAM,
    PAGE_SIZE_PARAM,
    SEARCH_PARAM,
} from "@vueda/utils/constants.js";

/**
 * Demo customer rows. Fictional throughout; domains use `domain.invalid` per the repo test
 * convention.
 *
 * @type {object[]}
 */
export const CUSTOMER_RECORDS = [
    {
        id: 1,
        account: "Northwind Logistics",
        domain: "https://northwind.domain.invalid",
        owner: "mt",
        tier: "enterprise",
        mrr: "18400.00",
        currency: "usd",
        taxExempt: false,
        notes: "Renewal review each March.",
    },
    {
        id: 2,
        account: "Granger Holdings",
        domain: "https://granger.domain.invalid",
        owner: "jr",
        tier: "enterprise",
        mrr: "12250.00",
        currency: "usd",
        taxExempt: false,
        notes: "Consolidated billing across four subsidiaries.",
    },
    {
        id: 3,
        account: "Aldergrove Foods",
        domain: "https://aldergrove.domain.invalid",
        owner: "ps",
        tier: "standard",
        mrr: "4300.00",
        currency: "cad",
        taxExempt: false,
        notes: "",
    },
    {
        id: 4,
        account: "Vellum Press",
        domain: "https://vellumpress.domain.invalid",
        owner: "lb",
        tier: "standard",
        mrr: "2875.50",
        currency: "gbp",
        taxExempt: true,
        notes: "Registered charity; tax exemption on file.",
    },
    {
        id: 5,
        account: "Harbourline Marine",
        domain: "https://harbourline.domain.invalid",
        owner: "mt",
        tier: "standard",
        mrr: "3960.00",
        currency: "eur",
        taxExempt: false,
        notes: "",
    },
    {
        id: 6,
        account: "Kestrel Analytics",
        domain: "https://kestrel.domain.invalid",
        owner: "jr",
        tier: "trial",
        mrr: "0.00",
        currency: "usd",
        taxExempt: false,
        notes: "Trial ends at the end of the quarter.",
    },
    {
        id: 7,
        account: "Ossington Dental",
        domain: "https://ossington.domain.invalid",
        owner: "ps",
        tier: "standard",
        mrr: "1180.00",
        currency: "cad",
        taxExempt: false,
        notes: "",
    },
    {
        id: 8,
        account: "Brightwater Utilities",
        domain: "https://brightwater.domain.invalid",
        owner: "lb",
        tier: "enterprise",
        mrr: "22100.00",
        currency: "usd",
        taxExempt: false,
        notes: "Procurement requires a signed DPA before each renewal.",
    },
    {
        id: 9,
        account: "Fennimore Textiles",
        domain: "https://fennimore.domain.invalid",
        owner: "mt",
        tier: "standard",
        mrr: "5420.00",
        currency: "eur",
        taxExempt: false,
        notes: "",
    },
    {
        id: 10,
        account: "Calderwood Legal",
        domain: "https://calderwood.domain.invalid",
        owner: "jr",
        tier: "standard",
        mrr: "6100.00",
        currency: "gbp",
        taxExempt: false,
        notes: "",
    },
    {
        id: 11,
        account: "Pelham Transit Authority",
        domain: "https://pelhamtransit.domain.invalid",
        owner: "ps",
        tier: "enterprise",
        mrr: "15750.00",
        currency: "cad",
        taxExempt: true,
        notes: "Public body; exempt under provincial rules.",
    },
    {
        id: 12,
        account: "Sablefish Cold Storage",
        domain: "https://sablefish.domain.invalid",
        owner: "lb",
        tier: "trial",
        mrr: "0.00",
        currency: "usd",
        taxExempt: false,
        notes: "",
    },
    {
        id: 13,
        account: "Marlowe & Finch",
        domain: "https://marlowefinch.domain.invalid",
        owner: "mt",
        tier: "standard",
        mrr: "3200.00",
        currency: "gbp",
        taxExempt: false,
        notes: "",
    },
    {
        id: 14,
        account: "Ridgeway Composites",
        domain: "https://ridgeway.domain.invalid",
        owner: "jr",
        tier: "standard",
        mrr: "7640.00",
        currency: "usd",
        taxExempt: false,
        notes: "",
    },
    {
        id: 15,
        account: "Tullamore Distributing",
        domain: "https://tullamore.domain.invalid",
        owner: "ps",
        tier: "trial",
        mrr: "0.00",
        currency: "eur",
        taxExempt: false,
        notes: "Evaluating against two competitors.",
    },
    {
        id: 16,
        account: "Wexford Instruments",
        domain: "https://wexford.domain.invalid",
        owner: "lb",
        tier: "enterprise",
        mrr: "19300.00",
        currency: "usd",
        taxExempt: false,
        notes: "",
    },
    {
        id: 17,
        account: "Bellhaven Clinics",
        domain: "https://bellhaven.domain.invalid",
        owner: "mt",
        tier: "standard",
        mrr: "8850.00",
        currency: "cad",
        taxExempt: false,
        notes: "",
    },
    {
        id: 18,
        account: "Currant Hill Vineyard",
        domain: "https://curranthill.domain.invalid",
        owner: "jr",
        tier: "standard",
        mrr: "2410.00",
        currency: "eur",
        taxExempt: false,
        notes: "",
    },
    {
        id: 19,
        account: "Oakbank Freight",
        domain: "https://oakbank.domain.invalid",
        owner: "ps",
        tier: "standard",
        mrr: "5100.00",
        currency: "cad",
        taxExempt: false,
        notes: "",
    },
    {
        id: 20,
        account: "Stonecroft Insurance",
        domain: "https://stonecroft.domain.invalid",
        owner: "lb",
        tier: "enterprise",
        mrr: "26500.00",
        currency: "gbp",
        taxExempt: false,
        notes: "Two named accounts under one contract.",
    },
    {
        id: 21,
        account: "Larkspur Media",
        domain: "https://larkspur.domain.invalid",
        owner: "mt",
        tier: "trial",
        mrr: "0.00",
        currency: "usd",
        taxExempt: false,
        notes: "",
    },
    {
        id: 22,
        account: "Dunmore Aggregates",
        domain: "https://dunmore.domain.invalid",
        owner: "jr",
        tier: "standard",
        mrr: "4780.00",
        currency: "cad",
        taxExempt: false,
        notes: "",
    },
    {
        id: 23,
        account: "Ashgrove Nurseries",
        domain: "https://ashgrove.domain.invalid",
        owner: "ps",
        tier: "standard",
        mrr: "1990.00",
        currency: "eur",
        taxExempt: true,
        notes: "Agricultural exemption certificate expires next year.",
    },
    {
        id: 24,
        account: "Kingsmere Robotics",
        domain: "https://kingsmere.domain.invalid",
        owner: "lb",
        tier: "enterprise",
        mrr: "31200.00",
        currency: "usd",
        taxExempt: false,
        notes: "",
    },
    {
        id: 25,
        account: "Thornbury Rail",
        domain: "https://thornbury.domain.invalid",
        owner: "mt",
        tier: "standard",
        mrr: "9400.00",
        currency: "gbp",
        taxExempt: false,
        notes: "",
    },
    {
        id: 26,
        account: "Priorswood Chemicals",
        domain: "https://priorswood.domain.invalid",
        owner: "jr",
        tier: "standard",
        mrr: "6720.00",
        currency: "eur",
        taxExempt: false,
        notes: "",
    },
    {
        id: 27,
        account: "Halloway Print Group",
        domain: "https://halloway.domain.invalid",
        owner: "ps",
        tier: "trial",
        mrr: "0.00",
        currency: "cad",
        taxExempt: false,
        notes: "",
    },
    {
        id: 28,
        account: "Merrivale Grain",
        domain: "https://merrivale.domain.invalid",
        owner: "lb",
        tier: "standard",
        mrr: "3540.00",
        currency: "usd",
        taxExempt: false,
        notes: "",
    },
];

/** Fields the list endpoint scans for the `s` (search) query param. */
const SEARCH_FIELDS = ["account", "domain", "notes"];

/**
 * Per-record actions a vueda server attaches to every serialized instance (see
 * `vueda/core/serializers/fields.py`; `create` is excluded on an instance). The detail
 * views read this off the record, not off the model config, so a record without it
 * renders an empty action bar.
 *
 * @type {string[]}
 */
export const RECORD_AVAILABLE_ACTIONS = ["list", "retrieve", "update", "partial_update", "destroy"];

/**
 * Attach the fields a server adds to every serialized instance.
 *
 * `formatted_name` is a `GeneratedField` on vueda's base model (`vueda/core/models.py`), so
 * every row carries one; here it mirrors the account name. `WidgetReadOnly` prefers it over
 * the raw value, which is what makes the selected-records list in a destroy or action
 * confirmation read as names rather than primary keys.
 *
 * All three stay snake_case: `storeModelInfo` camelCases model info on fetch, but record
 * payloads are pushed through untouched and read by their server names.
 *
 * @param {object} record
 * @param {string[]} availableActions
 * @param {object[]} validTransitions
 * @returns {object}
 */
function withServerFields(record, availableActions, validTransitions) {
    return {
        ...record,
        formatted_name: record.account,
        available_actions: availableActions,
        valid_transitions: validTransitions,
    };
}

/**
 * Actions for the `ViewHistoryList` demos, in the shape the `history_list` action returns.
 * Newest first.
 *
 * Keys stay snake_case: record payloads are pushed through untouched and read by their server
 * names. One result is one action; `id` is the pk (`ViewHistoryList` sets `pkKey: "id"`), and it
 * is the action's id, or the lone event's id for a write recorded outside any action. An event
 * with no `changes` renders as its type (created or deleted) rather than as a list of field
 * changes, and a referenced row arrives as `{ id, display, missing }`.
 *
 * @type {object[]}
 */
export const CUSTOMER_HISTORY = [
    {
        id: "0e7b2c9a-4d61-4f3e-9b8a-1c2d3e4f5a6b",
        action_id: "0e7b2c9a-4d61-4f3e-9b8a-1c2d3e4f5a6b",
        recorded_at: "2026-08-14T15:22:04Z",
        kind: "request",
        label: "update",
        actor: { id: 3, display: "Mara Tani", missing: false },
        events: [
            {
                id: "showcase.Customer:5",
                model: "showcase.Customer",
                object_id: "1",
                relation: "self",
                type: "updated",
                recorded_at: "2026-08-14T15:22:04Z",
                changes: [
                    { field: "tier", old: "standard", new: "enterprise" },
                    { field: "mrr", old: "12400.00", new: "18400.00" },
                ],
            },
            {
                id: "showcase.Contract:41",
                model: "showcase.Contract",
                object_id: "41",
                relation: "related",
                type: "created",
                recorded_at: "2026-08-14T15:22:04Z",
                changes: [],
            },
        ],
    },
    {
        id: "7f1a9d3c-2b5e-4a8f-8c7d-9e0f1a2b3c4d",
        action_id: "7f1a9d3c-2b5e-4a8f-8c7d-9e0f1a2b3c4d",
        recorded_at: "2026-06-02T11:08:41Z",
        kind: "request",
        label: "update",
        actor: { id: 5, display: "Jordan Reyes", missing: false },
        events: [
            {
                id: "showcase.Customer:4",
                model: "showcase.Customer",
                object_id: "1",
                relation: "self",
                type: "updated",
                recorded_at: "2026-06-02T11:08:41Z",
                changes: [
                    {
                        field: "owner",
                        old: { id: 5, display: "Jordan Reyes", missing: false },
                        new: { id: 3, display: "Mara Tani", missing: false },
                    },
                ],
            },
        ],
    },
    {
        id: "c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f",
        action_id: "c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f",
        recorded_at: "2026-03-19T09:47:15Z",
        kind: "task",
        label: "showcase.tasks.sync_notes",
        actor: null,
        events: [
            {
                id: "showcase.Customer:3",
                model: "showcase.Customer",
                object_id: "1",
                relation: "self",
                type: "updated",
                recorded_at: "2026-03-19T09:47:15Z",
                changes: [{ field: "notes", old: "", new: "Renewal review each March." }],
            },
        ],
    },
    {
        id: "a1b2c3d4-e5f6-4a7b-9c8d-0e1f2a3b4c5d",
        action_id: "a1b2c3d4-e5f6-4a7b-9c8d-0e1f2a3b4c5d",
        recorded_at: "2025-11-27T17:31:52Z",
        kind: "request",
        label: "update",
        actor: { id: 9, display: null, missing: true },
        events: [
            {
                id: "showcase.Customer:2",
                model: "showcase.Customer",
                object_id: "1",
                relation: "self",
                type: "updated",
                recorded_at: "2025-11-27T17:31:52Z",
                changes: [{ field: "archived", old: true, new: false }],
            },
        ],
    },
    {
        id: "showcase.Customer:1",
        action_id: null,
        recorded_at: "2025-11-04T13:12:00Z",
        kind: null,
        label: null,
        actor: null,
        events: [
            {
                id: "showcase.Customer:1",
                model: "showcase.Customer",
                object_id: "1",
                relation: "self",
                type: "created",
                recorded_at: "2025-11-04T13:12:00Z",
                changes: [],
            },
        ],
    },
];

/**
 * Seed the demo model metadata under a given app label so `getConfig` resolves offline.
 * Idempotent: re-seeding overwrites the same key.
 *
 * @param {import('pinia').Pinia} pinia - The pinia instance to seed.
 * @param {string} [app] - App label to register under; defaults to the showcase app.
 * @returns {void}
 */
export function seedCustomerModel(pinia, app = SHOWCASE_CUSTOMER.app, viewConfigs = null) {
    const info = app === SHOWCASE_CUSTOMER.app ? customerModelInfo : { ...customerModelInfo, appLabel: app };
    storeModelInfo(pinia).infos[getAppModelDotName({ app, model: SHOWCASE_CUSTOMER.model })] = info;
    if (viewConfigs) {
        // The same call an integrator makes at bootstrap to narrow a view: config overrides are
        // merged over what is derived from model info (`storeModelConfig.setConfig`).
        storeModelConfig(pinia).setConfig({ app, model: SHOWCASE_CUSTOMER.model }, null, viewConfigs);
    }
}

/**
 * Build the matched `seed` / `api` pair a `ModelDemo` needs for the showcase customer
 * model. Pass a distinct `app` label per divergent scenario on the same page.
 *
 * @param {object} [options]
 * @param {string} [options.app] - App label the demo mounts under.
 * @param {object[]} [options.records] - Rows the list and detail endpoints serve.
 * @param {object[]} [options.history] - Action groups the history endpoint serves.
 * @param {(context: import('./demoApi.js').DemoRequestContext) => any} [options.onDelete] -
 *   Overrides the delete response; default is 204 with the rows left untouched, since
 *   each demo remounts against the pristine fixture anyway.
 * @param {object[]} [options.transitions] - Workflow transitions the model offers.
 * @param {string[]} [options.availableActions] - Per-record `available_actions`.
 * @param {object[]} [options.validTransitions] - Per-record `valid_transitions`.
 * @param {object[]} [options.actions] - Model actions to answer; see `modelRoutes`.
 * @param {{[view: string]: object}} [options.viewConfigs] - Per-view model config overrides, applied
 *   through `storeModelConfig.setConfig` the way an integrator narrows a view at bootstrap.
 * @returns {{ app: string, model: string, seed: Function, api: object[] }}
 */
export function customerScenario({
    app = SHOWCASE_CUSTOMER.app,
    records = CUSTOMER_RECORDS,
    history = CUSTOMER_HISTORY,
    onDelete,
    transitions = [],
    availableActions = RECORD_AVAILABLE_ACTIONS,
    validTransitions = [],
    actions = [],
    viewConfigs = null,
} = {}) {
    const model = SHOWCASE_CUSTOMER.model;
    return {
        app,
        model,
        seed: (pinia) => seedCustomerModel(pinia, app, viewConfigs),
        api: modelRoutes({
            app,
            model,
            records,
            history,
            onDelete,
            transitions,
            availableActions,
            validTransitions,
            actions,
        }),
    };
}

/**
 * Build the standard endpoint set for one model: list, retrieve, delete, and object
 * history. Patterns are scoped by app label and model so they cannot capture another
 * demo's requests.
 *
 * @param {object} options
 * @param {string} options.app - App label, as it appears in the URL.
 * @param {string} options.model - Model name, as it appears in the URL.
 * @param {object[]} options.records - Rows to serve.
 * @param {object[]} [options.history] - Action groups the history endpoint serves.
 * @param {Function} [options.onDelete] - Custom delete handler.
 * @param {object[]} [options.transitions] - Workflow transitions the model offers. An
 *   empty array is the answer for a model with no workflow, and is what keeps ViewList
 *   from logging an unmocked-endpoint warning on every mount.
 * @param {string[]} [options.availableActions] - Per-record `available_actions`, which is
 *   what the detail views read to decide which action buttons exist.
 * @param {object[]} [options.validTransitions] - Per-record `valid_transitions`.
 * @param {DemoModelAction[]} [options.actions] - Model actions to answer, each at both of the
 *   URLs `useModelAction` uses: the detail url for one record and the list url for several.
 * @param {string} [options.pkKey="id"] - Primary key field on each row.
 * @returns {import('./demoApi.js').DemoRoute[]}
 */
export function modelRoutes({
    app,
    model,
    records,
    history = [],
    onDelete,
    transitions = [],
    availableActions = RECORD_AVAILABLE_ACTIONS,
    validTransitions = [],
    actions = [],
    pkKey = "id",
}) {
    const scope = `${escapeForPattern(app.toLowerCase())}/${escapeForPattern(routePart(model))}`;
    const byPk = (pk) => records.find((record) => String(record[pkKey]) === String(pk));
    const serialize = (record) => withServerFields(record, availableActions, validTransitions);
    return [
        ...actions.flatMap((action) => actionRoutes({ scope, model, action, byPk })),
        {
            method: "GET",
            path: new RegExp(`^/routes/${scope}/$`),
            handler: ({ query }) => paginate(applyQuery(records, query).map(serialize), query),
        },
        {
            method: "GET",
            path: new RegExp(`^/routes/${scope}/(?<pk>[^/]+)/$`),
            handler: ({ params }) => {
                const record = byPk(params.pk);
                return record ? serialize(record) : notFound(model, params.pk);
            },
        },
        {
            method: "DELETE",
            path: new RegExp(`^/routes/${scope}/(?<pk>[^/]+)/$`),
            handler: (context) => {
                if (onDelete) {
                    return onDelete(context);
                }
                // 404 an unknown pk rather than accepting any trailing segment. A DELETE that
                // wrongly appends an action name ("/customer/destroy/") lands here looking
                // like a detail delete for pk "destroy"; answering it 204 would hide the bad
                // url the way it once hid the action-segment bug in `useModelAction`.
                if (!byPk(context.params.pk)) {
                    return notFound(model, context.params.pk);
                }
                return isDryRun(context) ? demoResponse(200) : demoResponse(204);
            },
        },
        {
            // Create posts the submitted fields to the list url and answers 201 with the created
            // record. The fixture rows are pristine per demo mount, so nothing is stored: the id
            // is invented from the row count.
            method: "POST",
            path: new RegExp(`^/routes/${scope}/$`),
            handler: ({ body }) => demoResponse(201, serialize({ ...(body || {}), [pkKey]: records.length + 1 })),
        },
        {
            // Update and partial update answer with the record merged with what was sent, which is
            // what lets the view redirect onto a detail screen that shows the new values.
            method: "PUT",
            path: new RegExp(`^/routes/${scope}/(?<pk>[^/]+)/$`),
            handler: ({ params, body }) => {
                const record = byPk(params.pk);
                return record ? serialize({ ...record, ...(body || {}) }) : notFound(model, params.pk);
            },
        },
        {
            method: "PATCH",
            path: new RegExp(`^/routes/${scope}/(?<pk>[^/]+)/$`),
            handler: ({ params, body }) => {
                const record = byPk(params.pk);
                return record ? serialize({ ...record, ...(body || {}) }) : notFound(model, params.pk);
            },
        },
        {
            // Bulk delete posts to the LIST url with a `{ pks }` body, and ActionForm sends
            // it twice: a `Dry-Run: true` pre-flight, then the real request. The server
            // answers 200 for the pre-flight and 204 only for an actual delete
            // (`vueda/core/viewsets/__init__.py`, `destroy`), so the two are distinct here.
            method: "DELETE",
            path: new RegExp(`^/routes/${scope}/$`),
            handler: (context) => {
                if (onDelete) {
                    return onDelete(context);
                }
                return isDryRun(context) ? demoResponse(200) : demoResponse(204);
            },
        },
        {
            // `ViewHistoryList` reads its action groups from a detail action on the model, not from
            // the `workflow-state-history` url: its target is `{ app, model, pk, action: "history_list" }`
            // (`client/lib/views/ViewHistoryList.vue`).
            method: "GET",
            path: new RegExp(`^/routes/${scope}/(?<pk>[^/]+)/history_list/$`),
            handler: ({ query }) => paginate(history, query),
        },
        {
            method: "GET",
            path: new RegExp(`^/routes/vueda\\.workflow/workflows/${scope}/permitted_transitions/$`),
            handler: () => transitions,
        },
    ];
}

/**
 * One model action the demo answers.
 *
 * @typedef {object} DemoModelAction
 * @property {string} name - Action name as it appears in the URL, e.g. "activate".
 * @property {string} [method="PUT"] - HTTP method the view sends. `ViewActivate` sends PATCH.
 * @property {(context: import('./demoApi.js').DemoRequestContext & { pks: string[] }) => any} [handler] -
 *   Overrides the response.
 */

/**
 * Build the detail and bulk endpoints for one model action.
 *
 * `useModelAction` sends a single record's action to the detail url and several to the list
 * url with a `{ pks }` body, so both exist here. Both answer 200 with a `detail` string, which
 * is what vueda's own actions return (`vueda/core/viewsets/__init__.py`, `activate`).
 *
 * The dry-run pre-flight is answered exactly like the real request, because the server answers
 * it the same way: `@action` runs the body and rolls the transaction back
 * (`vueda/core/decorators.py`), so a pre-flight is a real round-trip that leaves no trace,
 * not a separate status code. Only `destroy` distinguishes the two (200 against 204).
 *
 * @param {object} options
 * @param {string} options.scope - `app/model` url segment, already regex-escaped.
 * @param {string} options.model - Model name, for the response text.
 * @param {DemoModelAction} options.action - The action to answer.
 * @param {(pk: string) => object|undefined} options.byPk - Record lookup, so an unknown pk 404s
 *   rather than being accepted (see the delete endpoint's note).
 * @returns {import('./demoApi.js').DemoRoute[]}
 */
function actionRoutes({ scope, model, action, byPk }) {
    const { name, method = "PUT", handler } = action;
    const part = escapeForPattern(routePart(name));
    const ran = (pks) => demoResponse(200, { detail: `Ran ${name} on ${pks.length} ${model}.` });
    return [
        {
            method,
            path: new RegExp(`^/routes/${scope}/(?<pk>[^/]+)/${part}/$`),
            handler: (context) => {
                if (!byPk(context.params.pk)) {
                    return notFound(model, context.params.pk);
                }
                const pks = [context.params.pk];
                return handler ? handler({ ...context, pks }) : ran(pks);
            },
        },
        {
            method,
            path: new RegExp(`^/routes/${scope}/${part}/$`),
            handler: (context) => {
                const pks = context.body?.pks ?? [];
                return handler ? handler({ ...context, pks }) : ran(pks);
            },
        },
    ];
}

/**
 * @param {import('./demoApi.js').DemoRequestContext} context
 * @returns {boolean} True when the request is ActionForm's dry-run pre-flight.
 */
function isDryRun(context) {
    return context.headers?.get("Dry-Run")?.toLowerCase() === "true";
}

/**
 * Apply the list query params (`s` search, `o` ordering, and any `field__lookup=` filter)
 * to the fixture rows.
 *
 * @param {object[]} records
 * @param {URLSearchParams} query
 * @returns {object[]} A new, filtered and sorted array.
 */
function applyQuery(records, query) {
    let rows = records.slice();

    const search = query.get(SEARCH_PARAM);
    if (search) {
        const needle = search.toLowerCase();
        rows = rows.filter((row) =>
            SEARCH_FIELDS.some((field) =>
                String(row[field] ?? "")
                    .toLowerCase()
                    .includes(needle),
            ),
        );
    }

    const sample = records[0] ?? {};
    for (const [key, value] of query.entries()) {
        if (RESERVED_PARAMS.has(key) || value === "") {
            continue;
        }
        const [field, lookup = "exact"] = key.split("__");
        if (!(field in sample)) {
            continue;
        }
        rows = rows.filter((row) => matchesLookup(row[field], lookup, value));
    }

    const ordering = query.get(ORDERING_PARAM);
    if (ordering) {
        // Later entries break ties left by earlier ones, so compare in order and stop at
        // the first non-zero result (the same precedence the sort chips display).
        const terms = ordering
            .split(",")
            .filter(Boolean)
            .map((entry) => ({
                field: entry.startsWith("-") ? entry.slice(1) : entry,
                direction: entry.startsWith("-") ? -1 : 1,
            }));
        rows.sort((a, b) => {
            for (const { field, direction } of terms) {
                const result = compareValues(a[field], b[field]);
                if (result !== 0) {
                    return result * direction;
                }
            }
            return 0;
        });
    }

    return rows;
}

/** Query params the list endpoint interprets itself rather than treating as filters. */
const RESERVED_PARAMS = new Set([PAGE_PARAM, PAGE_SIZE_PARAM, SEARCH_PARAM, ORDERING_PARAM, "f", "e"]);

/**
 * Slice rows into the DRF-shaped envelope the list adaptor expects. A missing `ps`
 * means the caller asked for every page (the "All" rows-per-page option), which the
 * all-pages adaptor drives by omitting the param.
 *
 * @param {object[]} rows
 * @param {URLSearchParams} query
 * @returns {{totalRecords: number, totalPages: number, perPage: number, results: object[]}}
 */
function paginate(rows, query) {
    const requested = Number(query.get(PAGE_SIZE_PARAM));
    const size = Number.isFinite(requested) && requested > 0 ? requested : rows.length || DEFAULT_PAGE_SIZE;
    const page = Number(query.get(PAGE_PARAM) || 1);
    const start = (page - 1) * size;
    return {
        totalRecords: rows.length,
        totalPages: Math.max(1, Math.ceil(rows.length / size)),
        perPage: size,
        results: rows.slice(start, start + size),
    };
}

/**
 * Evaluate one Django filter lookup against a value.
 *
 * @param {any} value - The row's value.
 * @param {string} lookup - Django lookup expression (`icontains`, `gte`, `in`, ...).
 * @param {string} target - The query-string value.
 * @returns {boolean}
 */
function matchesLookup(value, lookup, target) {
    const text = String(value ?? "").toLowerCase();
    const needle = target.toLowerCase();
    switch (lookup) {
        case "icontains":
        case "contains":
            return text.includes(needle);
        case "istartswith":
        case "startswith":
            return text.startsWith(needle);
        case "iendswith":
        case "endswith":
            return text.endsWith(needle);
        case "in":
            return needle.split(",").includes(text);
        case "gt":
            return Number(value) > Number(target);
        case "gte":
            return Number(value) >= Number(target);
        case "lt":
            return Number(value) < Number(target);
        case "lte":
            return Number(value) <= Number(target);
        case "isnull":
            return (value === null || value === undefined) === (needle === "true");
        default:
            // A comma-separated value on a bare `field=` param is Django's in-list shorthand,
            // and is how `makeSearchParamsString` serializes an array param. ViewDestroy relies
            // on it: it loads its selected records with `?id=1,2,3`.
            if (needle.includes(",")) {
                return needle.split(",").includes(text);
            }
            // Booleans arrive as "true"/"false" strings; everything else compares as text.
            return typeof value === "boolean" ? String(value) === needle : text === needle;
    }
}

/**
 * Order two field values: numerically when both parse as numbers, otherwise as text.
 *
 * @param {any} a
 * @param {any} b
 * @returns {number}
 */
function compareValues(a, b) {
    const numA = Number(a);
    const numB = Number(b);
    if (a !== "" && b !== "" && Number.isFinite(numA) && Number.isFinite(numB)) {
        return numA - numB;
    }
    return String(a ?? "").localeCompare(String(b ?? ""));
}

/**
 * @param {string} model
 * @param {string} pk
 * @returns {object} A 404 response, matching what the detail endpoint returns for a
 *   missing record so `useObject404` takes its real not-found path.
 */
function notFound(model, pk) {
    return demoResponse(404, { detail: `No ${model} matches pk ${pk}.` });
}

/**
 * Mirror `getServerRoutePart`: the URL segment for a model is its snake_cased name.
 *
 * @param {string} value
 * @returns {string}
 */
function routePart(value) {
    return value
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/[\s-]+/g, "_")
        .toLowerCase();
}

/**
 * @param {string} value
 * @returns {string} `value` with regex metacharacters escaped, so an app label containing
 *   a dot (`vueda.user`) matches literally.
 */
function escapeForPattern(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
