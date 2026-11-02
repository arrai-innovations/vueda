/**
 * @module stores/storeModelChoices
 * @description Pinia store for fetching and caching field-level choice lists for Django model fields and filters.
 */
import { trimReactiveObject } from "@arrai-innovations/reactive-helpers";
import { getAppModelDotName, memoizedSnakeCase } from "@vueda/utils/case.js";
import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { PAGE_SIZE_PARAM } from "@vueda/utils/constants.js";
import { AuthScopeInvalidatedError, FetchError } from "@vueda/utils/errors.js";
import { fetchHelper } from "@vueda/utils/fetchSupport.js";
import { getUrl } from "@vueda/utils/urls.js";
import { defineStore } from "pinia";
import { toRaw } from "vue";

/**
 * An error for use from the model info store.
 * @extends {FetchError}
 */
export class ModelChoicesError extends FetchError {
    /**
     * Creates an instance of ModelChoicesError.
     * @param {string} messagePrefix - The prefix for the error message.
     * @param {Response} [response] - The response object associated with the error.
     * @param {object|string} [responseData] - The data returned in the response.
     */
    constructor(messagePrefix, response, responseData) {
        super(messagePrefix, response, responseData);
        this.name = "ModelChoicesError";
    }
}

// The server routes carry a trailing slash; omitting it before the query string
// makes Django's APPEND_SLASH answer with a 301 redirect (an extra round-trip per
// fetch), so build the canonical slash-terminated path directly.
const modelChoicesPath = (app, model, field) =>
    `${httpOrHttpsHostname}${getUrl("infoModelInfoChoices")}${memoizedSnakeCase(app)}/${memoizedSnakeCase(model)}/${memoizedSnakeCase(field)}/`;

const modelChoicesUrl = (app, model, field) => `${modelChoicesPath(app, model, field)}?${PAGE_SIZE_PARAM}=200`;

/**
 * The largest number of values that one value-filtered choices request asks for. Every value is a
 * query parameter, so the cap keeps the URL short: 50 UUID values take about 2 KB. The request sets
 * a page size equal to its number of values, which stays under the server's default `MAX_PAGE_SIZE`
 * of 200.
 *
 * @type {number}
 * @private
 */
const CHOICE_LABELS_PER_REQUEST = 50;

/**
 * The longest encoded query string, in characters, that one value-filtered choices request sends.
 * Slug values can be long, so a batch also closes when its next value would pass this length. It
 * keeps the URL well under the 8 KB request-line limit of common servers and proxies.
 *
 * @type {number}
 * @private
 */
const CHOICE_LABELS_QUERY_LENGTH = 4000;

/**
 * How long, in milliseconds, `fetchChoiceLabels` collects values for one field before it sends a
 * request for them.
 *
 * @type {number}
 * @private
 */
const CHOICE_LABELS_BATCH_DELAY = 10;

const modelChoiceLabelsUrl = (app, model, field, values) => {
    const params = new URLSearchParams({ [PAGE_SIZE_PARAM]: String(values.length) });
    for (const value of values) {
        params.append("value", value);
    }
    return `${modelChoicesPath(app, model, field)}?${params}`;
};

/**
 * Report whether a stored choice list holds every option of its field.
 *
 * A list that the server paginated past its first page is not complete. A list with no
 * `totalRecords`, such as one that an integrator stored through `setChoices`, counts as complete.
 *
 * @param {object|undefined} choiceList
 * @returns {boolean}
 * @private
 */
const isCompleteChoiceList = (choiceList) => {
    if (!Array.isArray(choiceList?.results)) {
        return false;
    }
    return choiceList.totalRecords === undefined || choiceList.results.length >= choiceList.totalRecords;
};

const modelFilterChoicesUrl = (app, model, field) =>
    `${httpOrHttpsHostname}${getUrl("infoModelInfoFilterChoices")}${memoizedSnakeCase(app)}/${memoizedSnakeCase(model)}/${field}/?${PAGE_SIZE_PARAM}=200`;

/**
 * Empty a two-level store container in place, leaves first.
 *
 * `useModelChoices` holds a `toRef` handle into `choices[appModelKey]`, so the field keys are deleted
 * before the key that holds the per-model object. Neither container is ever replaced.
 *
 * @param {{[key: string]: object}} container
 * @returns {void}
 * @private
 */
const clearNestedContainer = (container) => {
    for (const key of Object.keys(container)) {
        trimReactiveObject(container[key], {});
    }
    trimReactiveObject(container, {});
};

/**
 * Adds one value to the field's open batch of label requests. When the field has no open batch,
 * or the open batch is full, this opens a new one. A batch is full at `CHOICE_LABELS_PER_REQUEST`
 * values, or when the next value would make its query longer than `CHOICE_LABELS_QUERY_LENGTH`.
 * A batch sends its request `CHOICE_LABELS_BATCH_DELAY` milliseconds after it opens.
 *
 * @param {ModelChoicesStore} store
 * @param {string} app
 * @param {string} model
 * @param {string} field
 * @param {string} value
 * @returns {Promise<void>}
 */
function queueChoiceLabel(store, app, model, field, value) {
    const key = getAppModelDotName({ app, model });
    if (!store.choiceLabelBatches[key]) {
        store.choiceLabelBatches[key] = {};
    }
    // "&value=" and the value, encoded the way modelChoiceLabelsUrl's URLSearchParams encodes it
    const valueLength = 1 + new URLSearchParams({ value }).toString().length;
    let batch = store.choiceLabelBatches[key][field];
    if (
        !batch ||
        batch.values.length >= CHOICE_LABELS_PER_REQUEST ||
        batch.queryLength + valueLength > CHOICE_LABELS_QUERY_LENGTH
    ) {
        const generation = store.authScopeGeneration;
        const values = [];
        const promise = new Promise((resolve) => {
            setTimeout(resolve, CHOICE_LABELS_BATCH_DELAY);
        }).then(() => sendChoiceLabelBatch(store, app, model, field, values, generation));
        batch = store.choiceLabelBatches[key][field] = { values, promise, queryLength: 0 };
    }
    batch.values.push(value);
    batch.queryLength += valueLength;
    return batch.promise;
}

/**
 * Sends one value-filtered request for a batch of values, and stores the labels that it
 * returns.
 *
 * @param {ModelChoicesStore} store
 * @param {string} app
 * @param {string} model
 * @param {string} field
 * @param {string[]} values
 * @param {number} generation - The `authScopeGeneration` that the batch was opened under.
 * @returns {Promise<void>}
 */
async function sendChoiceLabelBatch(store, app, model, field, values, generation) {
    const key = getAppModelDotName({ app, model });
    if (store.authScopeGeneration !== generation) {
        // `clearAuthScoped` already removed this batch and its promises.
        return;
    }
    // State wraps the batch in a reactive proxy, so compare the raw array with this batch's own.
    if (toRaw(store.choiceLabelBatches[key]?.[field]?.values) === values) {
        delete store.choiceLabelBatches[key][field];
    }
    try {
        const data = await fetchHelper(
            modelChoiceLabelsUrl(app, model, field, values),
            {
                method: "GET",
            },
            `Failed to fetch choice labels for ${key}.${field}`,
            ModelChoicesError,
        );
        if (store.authScopeGeneration !== generation) {
            // the authenticated user changed while this was in flight: these labels were
            // filtered for the previous principal, so they must not be cached.
            return;
        }
        const storedLabels = store.choiceLabels[key][field];
        const results = data?.results ?? [];
        // A value that a complete response leaves out has no option. A response cut to one
        // page, for example by a lower server MAX_PAGE_SIZE, says nothing about the rest.
        if (data?.totalRecords === undefined || results.length >= data.totalRecords) {
            for (const value of values) {
                storedLabels[value] = null;
            }
        }
        for (const option of results) {
            // A row whose key is null has no value to show a label for.
            if (option.value !== null) {
                storedLabels[String(option.value)] = option.label;
            }
        }
    } finally {
        if (store.authScopeGeneration === generation) {
            for (const value of values) {
                delete store.choiceLabelPromises[key][field][value];
            }
        }
    }
}

/**
 * A store for lookup choices for a particular model field.
 *
 * @typedef {ReturnType<typeof storeModelChoices>} ModelChoicesStore
 */
export const storeModelChoices = defineStore("modelChoices", {
    state: () => ({
        /**
         * Choice lists for model fields, keyed by app and model dot name, then by field name. A fetched
         * list is the server's paginated response, with `{label, value}` items in `results`.
         *
         * @type {{[appModelDotName: string]: {[fieldName: string]: object}}}
         */
        choices: {},
        /**
         * Choice lists for filters, keyed by app and model dot name, then by filter name. A fetched list
         * is the server's paginated response, with `{label, value}` items in `results`.
         *
         * @type {{[appModelDotName: string]: {[filterName: string]: object}}}
         */
        filterChoices: {},
        /**
         * The in-flight `fetchChoices` requests, keyed by app and model dot name, then by field name. A
         * request removes its entry when it settles.
         *
         * @type {{[appModelDotName: string]: {[fieldName: string]: Promise<object>}}}
         */
        promises: {},
        /**
         * The in-flight `fetchFilterChoices` requests, keyed by app and model dot name, then by filter
         * name. A request removes its entry when it settles.
         *
         * @type {{[appModelDotName: string]: {[filterName: string]: Promise<object>}}}
         */
        filterPromises: {},
        /**
         * Labels that `fetchChoiceLabels` fetched, keyed by app and model dot name, then by field name,
         * then by value. A value with no matching option holds `null`. This map is separate from
         * `choices`, so `choices` never holds a partial option list. Read a label with
         * `getChoiceLabel`, which also looks in `choices`.
         *
         * @type {{[appModelDotName: string]: {[fieldName: string]: {[value: string]: string|null}}}}
         */
        choiceLabels: {},
        /**
         * The in-flight `fetchChoiceLabels` requests, keyed by app and model dot name, then by field
         * name, then by value. A request removes its entries when it settles.
         *
         * @type {{[appModelDotName: string]: {[fieldName: string]: {[value: string]: Promise<void>}}}}
         */
        choiceLabelPromises: {},
        /**
         * The values that `fetchChoiceLabels` is still collecting for each field before it sends a
         * request, keyed by app and model dot name, then by field name. A batch is removed when its
         * request is sent.
         *
         * @type {{[appModelDotName: string]: {[fieldName: string]: {values: string[], promise: Promise<void>, queryLength: number}}}}
         */
        choiceLabelBatches: {},
        /**
         * Incremented by `clearAuthScoped`. Fetches capture it before issuing and discard their
         * response if it changed while the request was in flight.
         *
         * @type {number}
         */
        authScopeGeneration: 0,
    }),
    getters: {
        /**
         * Returns a function that reads the stored label of one value of a model field. It sends no
         * request.
         *
         * When the field's option list in `choices` is complete and holds the value, the function reads
         * the label from that list. A value that a complete list lacks is read from `choiceLabels`,
         * because its row can be newer than the list. When the list is not complete, the function reads
         * `choiceLabels` first, because `fetchChoiceLabels` fetched those labels for these values. When
         * `choiceLabels` has no label for the value, the function reads the partial list. Each value is
         * compared as a string. The function returns `null` when a value request found no matching
         * option. It returns `undefined` when the store does not know the label yet.
         *
         * @param {object} state - The store state.
         * @returns {(app: string, model: string, field: string, value: string|number) => string|null|undefined}
         *  The label reader.
         */
        getChoiceLabel: (state) => (app, model, field, value) => {
            const key = getAppModelDotName({ app, model });
            const stringValue = String(value);
            const choiceList = state.choices[key]?.[field];
            const listLabel = choiceList?.results?.find(
                (item) => item.value !== null && String(item.value) === stringValue,
            )?.label;
            const storedLabel = state.choiceLabels[key]?.[field]?.[stringValue];
            if (isCompleteChoiceList(choiceList)) {
                return listLabel ?? storedLabel;
            }
            if (storedLabel !== undefined && storedLabel !== null) {
                return storedLabel;
            }
            return listLabel ?? storedLabel;
        },
    },
    actions: {
        /**
         * Drops every cached choice list, because choices are row-level filtered for the
         * authenticated user.
         *
         * This includes lists an integrator seeded through `setChoices` or `setFilterChoices`: the
         * state shape does not record where a list came from, so seeded and fetched entries clear
         * together.
         *
         * Keys are deleted in place, leaves first, so `toRef` handles consumers hold keep reading the
         * live containers. Never replace a container here (that is what `$reset` does, and it detaches
         * every held handle).
         *
         * @returns {void}
         */
        clearAuthScoped() {
            this.authScopeGeneration += 1;
            clearNestedContainer(this.choices);
            clearNestedContainer(this.filterChoices);
            clearNestedContainer(this.promises);
            clearNestedContainer(this.filterPromises);
            clearNestedContainer(this.choiceLabels);
            clearNestedContainer(this.choiceLabelPromises);
            clearNestedContainer(this.choiceLabelBatches);
        },
        /**
         * Stores a choice list for a model field without fetching it.
         *
         * @param {string} app - Django app label.
         * @param {string} model - Model name.
         * @param {string} field - Field name.
         * @param {object} choices - The choice list: a paginated response object with `{label, value}`
         *     items in `results`.
         * @returns {void}
         */
        setChoices(app, model, field, choices) {
            const key = getAppModelDotName({ app, model });
            if (!this.choices[key]) {
                this.choices[key] = {};
            }
            this.choices[key][field] = choices;
        },
        /**
         * Stores a choice list for a filter without fetching it.
         *
         * @param {string} app - Django app label.
         * @param {string} model - Model name.
         * @param {string} field - Filter name.
         * @param {object} choices - The choice list: a paginated response object with `{label, value}`
         *     items in `results`.
         * @returns {void}
         */
        setFilterChoices(app, model, field, choices) {
            const key = getAppModelDotName({ app, model });
            if (!this.filterChoices[key]) {
                this.filterChoices[key] = {};
            }
            this.filterChoices[key][field] = choices;
        },
        /**
         * Fetches the choice list for a filter and stores it in `filterChoices`.
         *
         * A request already in flight for the same filter is shared. A stored list does not stop a new
         * request.
         *
         * @param {string} app - Django app label.
         * @param {string} model - Model name.
         * @param {string} field - Filter name, sent to the server as given.
         * @returns {Promise<object>} A promise for the server's paginated choice list. It rejects with
         *  `ModelChoicesError` when the request fails, and with `AuthScopeInvalidatedError` if the
         *  authenticated user changes while it is in flight.
         */
        async fetchFilterChoices(app, model, field) {
            const key = getAppModelDotName({ app, model });
            const generation = this.authScopeGeneration;
            if (!this.filterPromises[key]) {
                this.filterPromises[key] = {};
            }
            if (!this.filterChoices[key]) {
                this.filterChoices[key] = {};
            }
            if (!this.filterChoices[key][field]) {
                this.filterChoices[key][field] = {};
            }
            if (this.filterPromises[key][field]) {
                return this.filterPromises[key][field];
            }
            try {
                const data = await (this.filterPromises[key][field] = fetchHelper(
                    modelFilterChoicesUrl(app, model, field),
                    {
                        method: "GET",
                    },
                    `Failed to fetch choices for ${key}.${field}`,
                    ModelChoicesError,
                ));
                if (this.authScopeGeneration !== generation) {
                    // the authenticated user changed while this was in flight: these choices were
                    // filtered for the previous principal, so they must not be cached or returned.
                    throw new AuthScopeInvalidatedError("storeModelChoices.fetchFilterChoices", `${key}.${field}`);
                }
                return (this.filterChoices[key][field] = data);
            } finally {
                if (this.authScopeGeneration === generation) {
                    // a changed generation means `clearAuthScoped` already removed the bucket this
                    // entry lived in.
                    delete this.filterPromises[key][field];
                }
            }
        },
        /**
         * Fetches the choice list for a model field and stores it in `choices`.
         *
         * A request already in flight for the same field is shared. A stored list does not stop a new
         * request.
         *
         * @param {string} app - Django app label.
         * @param {string} model - Model name.
         * @param {string} field - Field name, converted to snake_case for the request.
         * @returns {Promise<object>} A promise for the server's paginated choice list. It rejects with
         *  `ModelChoicesError` when the request fails, and with `AuthScopeInvalidatedError` if the
         *  authenticated user changes while it is in flight.
         */
        async fetchChoices(app, model, field) {
            const key = getAppModelDotName({ app, model });
            const generation = this.authScopeGeneration;
            // we don't return the choices if they are already being fetched.
            // you probably want to get fresh choices.
            // this just prevents duplicate requests.
            if (!this.promises[key]) {
                this.promises[key] = {};
            }
            if (!this.choices[key]) {
                this.choices[key] = {};
            }
            if (!this.choices[key][field]) {
                this.choices[key][field] = {};
            }
            if (this.promises[key][field]) {
                return this.promises[key][field];
            }
            try {
                const data = await (this.promises[key][field] = fetchHelper(
                    modelChoicesUrl(app, model, field),
                    {
                        method: "GET",
                    },
                    `Failed to fetch choices for ${key}.${field}`,
                    ModelChoicesError,
                ));
                if (this.authScopeGeneration !== generation) {
                    // the authenticated user changed while this was in flight: these choices were
                    // filtered for the previous principal, so they must not be cached or returned.
                    throw new AuthScopeInvalidatedError("storeModelChoices.fetchChoices", `${key}.${field}`);
                }
                return (this.choices[key][field] = data);
            } finally {
                if (this.authScopeGeneration === generation) {
                    // a changed generation means `clearAuthScoped` already removed the bucket this
                    // entry lived in.
                    delete this.promises[key][field];
                }
            }
        },
        /**
         * Fetches the labels of some values of a model field.
         *
         * When a `fetchChoices` request for the field is in flight, this waits for it first. When
         * `choices` holds the field's complete option list, the labels of the values in that list come
         * from it, and no request is sent for them. A value that the list lacks is still requested,
         * because its row can be newer than the list. The values to request wait a short interval, so
         * that values that other calls ask for on the same field can join them. One request with a
         * `value` filter then fetches them all. A value that a pending or in-flight request already
         * asks for joins that request.
         *
         * The fetched labels are stored in `choiceLabels`. A label that is already stored does not stop
         * a new request, so labels follow changes to the rows behind them. `getChoiceLabel` reads the
         * stored label while the request runs.
         *
         * @param {string} app - Django app label.
         * @param {string} model - Model name.
         * @param {string} field - Field name, converted to snake_case for the request.
         * @param {(string|number)[]} values - The values to label. Each value is compared as a string.
         * @returns {Promise<{[value: string]: string|null|undefined}>} A promise for the label of each
         *  value, keyed by the value as a string. A value with no matching option maps to `null`. A value
         *  that the response did not settle maps to `undefined`, for example when the server cut the
         *  response to one page. The promise rejects with `ModelChoicesError` when the request fails. It
         *  rejects with `AuthScopeInvalidatedError` if the authenticated user changes while the request
         *  is in flight.
         */
        async fetchChoiceLabels(app, model, field, values) {
            const key = getAppModelDotName({ app, model });
            const wanted = [...new Set(values.map((value) => String(value)))];
            const generation = this.authScopeGeneration;
            const assertSameUser = () => {
                if (this.authScopeGeneration !== generation) {
                    // the authenticated user changed while this was in flight: the labels were filtered
                    // for the previous principal, so they were not stored and must not be returned.
                    throw new AuthScopeInvalidatedError("storeModelChoices.fetchChoiceLabels", `${key}.${field}`);
                }
            };
            const collectLabels = () => {
                assertSameUser();
                const labels = {};
                for (const value of wanted) {
                    labels[value] = this.getChoiceLabel(app, model, field, value);
                }
                return labels;
            };
            // A full option list that is already on its way answers every value, so wait for it.
            const choiceListRequest = this.promises[key]?.[field];
            if (choiceListRequest) {
                try {
                    await choiceListRequest;
                } catch {
                    // fetchChoices reports its own failure; the value request below still runs
                }
                assertSameUser();
            }
            // A complete list answers the values it holds. A value that it lacks is still requested,
            // because its row can be newer than the list.
            const choiceList = this.choices[key]?.[field];
            const toRequest = isCompleteChoiceList(choiceList)
                ? wanted.filter(
                      (value) =>
                          !choiceList.results.some((item) => item.value !== null && String(item.value) === value),
                  )
                : wanted;
            if (!toRequest.length) {
                return collectLabels();
            }

            if (!this.choiceLabels[key]) {
                this.choiceLabels[key] = {};
            }
            if (!this.choiceLabels[key][field]) {
                this.choiceLabels[key][field] = {};
            }
            if (!this.choiceLabelPromises[key]) {
                this.choiceLabelPromises[key] = {};
            }
            if (!this.choiceLabelPromises[key][field]) {
                this.choiceLabelPromises[key][field] = {};
            }
            const valuePromises = this.choiceLabelPromises[key][field];
            const pending = new Set();
            for (const value of toRequest) {
                if (!valuePromises[value]) {
                    valuePromises[value] = queueChoiceLabel(this, app, model, field, value);
                }
                pending.add(valuePromises[value]);
            }
            await Promise.all(pending);
            return collectLabels();
        },
        /**
         * Creates the empty per-model container in `choices`, or in `filterChoices` for a filter, if it
         * does not exist yet.
         *
         * @param {string} app - Django app label.
         * @param {string} model - Model name.
         * @param {boolean} [isFilter=false] - Whether to create the container in `filterChoices`.
         * @returns {void}
         */
        initializeChoice(app, model, isFilter = false) {
            const key = getAppModelDotName({ app, model });
            if (!this.choices[key] && !isFilter) {
                this.choices[key] = {};
            }
            if (!this.filterChoices[key] && isFilter) {
                this.filterChoices[key] = {};
            }
        },
    },
});
