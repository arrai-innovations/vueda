import { useList, useObject } from "@arrai-innovations/reactive-helpers";
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";
import { EXPAND_PARAM, FIELDS_PARAM } from "@vueda/utils/constants.js";
import { getAppModelDotName } from "@vueda/utils/crudSupport.js";
import { allPagePaginatedListCrudAdaptor } from "@vueda/utils/listCrud.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import debounce from "lodash-es/debounce.js";
import { effectScope, provide, reactive, readonly } from "vue";

export function useLookupContext() {
    const es = effectScope();
    /** @typedef {{
     *     promise: import('@arrai-innovations/reactive-helpers').CancellablePromise<object>,
     *     resolve: (value: object) => void,
     *     reject: (reason?: any) => void,
     * }} PerConsumerPromise */
    /**
     *  The cancellable promises we hand out for consumers to get their results.
     *  @type {{[key:string]: {[pk:string]: PerConsumerPromise[] }}} */
    const consumerPromises = {};
    /**
     *  The cancellable promises we are handed by the list/object manager.
     *  @type {{[key:string]: {[pk:string]: import('@arrai-innovations/reactive-helpers').CancellablePromise<boolean> }}} */
    const inflightPromises = {};
    /** @type {import('vue').Reactive<{[key:string]: {[pk:string]: object}}>} */
    const results = reactive({});
    const readonlyResults = readonly(results);
    /** @typedef {{app:string, model:string, fields:string[], expands:string[], pk:string}} Request */
    /** @type {Map<[key: string], Request>} */
    const requestsMap = new Map();
    /** @typedef {{
     *     props: import('@arrai-innovations/reactive-helpers').ObjectManagerProps,
     *     instance: import('@arrai-innovations/reactive-helpers').ObjectManager
     }} ObjectManagerContainer */
    /** @type {ObjectManagerContainer[]} */
    const idleObjects = [];
    /** @type {ObjectManagerContainer[]} */
    const busyObjects = [];
    /** @typedef {{
     *     props: import('@arrai-innovations/reactive-helpers').ListManagerProps,
     *     instance: import('@arrai-innovations/reactive-helpers').ListManager
     }} ListManagerContainer */
    /** @type {ListManagerContainer[]} */
    const idleLists = [];
    /** @type {ListManagerContainer[]} */
    const busyLists = [];
    const modelConfigStore = storeModelConfig();

    /**
     * Acquire or reuse an instance of the object or list manager.
     *
     * @private
     * @param {boolean} isList
     * @param {object} args
     * @param {string[]} pks
     * @returns {Promise<{ props: object, instance: import('@vueda/reactive-helpers/use/useList.js').ListManager|import('@vueda/reactive-helpers/use/useObject.js').ObjectManager }>}
     */
    async function acquireManager({ isList, args, pks }) {
        const pool = isList ? idleLists : idleObjects;
        const busy = isList ? busyLists : busyObjects;
        let entry = pool.pop();

        const pkKey = await modelConfigStore.getConfig(args).then((c) => c.info?.pk ?? "id");

        if (!entry) {
            // Create a new instance
            entry = es.run(() => {
                if (isList) {
                    const listProps = reactive({
                        crudArgs: { app: args.app, model: args.model },
                        pkKey,
                        listArgs: { id: pks },
                        retrieveArgs: {}, // optional in list
                    });

                    const instance = useList({
                        props: listProps,
                        functions: {
                            list: allPagePaginatedListCrudAdaptor,
                        },
                        paged: false,
                        keepOldPages: false,
                        clearListOnListIntentTriggered: false,
                    });

                    return { props: listProps, instance };
                } else {
                    const objectProps = reactive({
                        crudArgs: { app: args.app, model: args.model },
                        pkKey,
                        pk: pks[0],
                        retrieveArgs: {},
                    });

                    const instance = useObject({ props: objectProps, functions: {} });

                    return { props: objectProps, instance };
                }
            });
        } else {
            // Reuse the manager
            entry.props.pkKey = pkKey;
            entry.props.crudArgs.app = args.app;
            entry.props.crudArgs.model = args.model;
            if (isList) {
                entry.props.listArgs.id = pks;
            } else {
                entry.props.pk = pks[0];
            }
        }
        busy.push(entry);
        return entry;
    }

    /**
     * Do the actual list() or retrieve() call, and capture its cancel function.
     * @private
     * @param {object} args
     * @param {string} args.app
     * @param {string} args.model
     * @param {string[]} args.fields
     * @param {string[]} args.expand
     * @param {object} entry
     * @param {object} entry.props
     * @param {object} entry.instance
     * @param {boolean} isList
     * @param {string} key
     * @param {string[]} pks
     * @returns {Promise<boolean>} - true if the request was successful, false otherwise.
     */
    async function runRequestBatch({ app, model, fields, expand }, { props, instance }, isList, key, pks) {
        const config = await modelConfigStore.getConfig({ app, model });
        props.pkKey = config.info?.pk ?? "id";
        props.crudArgs.app = app;
        props.crudArgs.model = model;
        if (!props.retrieveArgs) {
            props.retrieveArgs = {};
        }
        if (isList && !props.listArgs) {
            props.listArgs = {};
        }
        const argKey = isList ? "listArgs" : "retrieveArgs";
        props[argKey][FIELDS_PARAM] = fields;
        props[argKey][EXPAND_PARAM] = expand;
        const managerPromise = isList ? instance.list() : instance.retrieve();
        if (!inflightPromises[key]) {
            inflightPromises[key] = {};
        }
        for (const pk of pks) {
            inflightPromises[key][pk] = managerPromise;
        }
        return managerPromise;
    }

    /**
     * Called whenever someone adds a request to requestsMap.
     * @returns {Promise<void>}
     */
    const scheduledRequest = debounce(
        async () => {
            for (const [key, /** @type{Request[]} */ requests] of requestsMap.entries()) {
                const pks = requests.map((request) => request.pk);
                /** @type {Request} */
                const args = requests[0];
                const isList = requests.length > 1;

                const entry = await acquireManager({
                    isList,
                    args,
                    pks,
                });

                try {
                    const outcome = await runRequestBatch(args, entry, isList, key, pks);

                    for (const pk of pks) {
                        if (!results[key]) {
                            results[key] = {};
                        }
                        // cloneDeep since we are about to clear our entry.instance
                        results[key][pk] = cloneDeep(
                            isList ? entry.instance.state.objects[pk] : entry.instance.state.object,
                        );
                        const promises = consumerPromises?.[key]?.[pk];
                        let consumed;
                        for (const promise of promises || []) {
                            if (!outcome) {
                                consumed = true;
                                promise.reject(entry.instance.state.error);
                                continue;
                            }
                            consumed = true;
                            promise.resolve(readonlyResults[key][pk]);
                        }
                        if (!consumed) {
                            console.warn("No consumers for this request", key, pk);
                        }
                    }
                } catch (e) {
                    let rejected = false;
                    for (const pk of pks) {
                        const promises = consumerPromises?.[key]?.[pk];
                        for (const promise of promises || []) {
                            rejected = true;
                            promise.reject(e);
                        }
                    }
                    if (!rejected) {
                        throw e;
                    }
                } finally {
                    for (const pk of pks) {
                        if (consumerPromises?.[key]?.[pk]) {
                            delete consumerPromises[key][pk];
                        }
                        if (inflightPromises?.[key]?.[pk]) {
                            delete inflightPromises[key][pk];
                        }
                    }
                    if (consumerPromises[key] && !Object.keys(consumerPromises[key]).length) {
                        delete consumerPromises[key];
                    }
                    if (inflightPromises[key] && !Object.keys(inflightPromises[key]).length) {
                        delete inflightPromises[key];
                    }
                    if (isList) {
                        entry.instance.clearList();
                        idleLists.push(entry);
                    } else {
                        entry.instance.clear();
                        idleObjects.push(entry);
                    }
                }
            }
            requestsMap.clear();
        },
        250,
        { maxWait: 1000 },
    );

    const getLookupKey = (app, model, fields, expands) => {
        const appModelDotName = getAppModelDotName({ app, model });
        const fieldKey = [...(fields || [])].sort().join(",");
        const expandKey = [...(expands || [])].sort().join(",");
        return `${appModelDotName}/${fieldKey}/${expandKey}`;
    };

    const newPromiseUnwrapper = (key, pk) => {
        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        const self = /** @type {PerConsumerPromise} */ {
            promise,
            resolve,
            reject,
        };
        promise.cancel = (reason = "Lookup cancelled") => {
            const myIndex = consumerPromises[key][pk].indexOf(self);
            if (myIndex === -1) {
                console.trace("Promise not found in consumerPromises, was cancel called twice?", key, pk);
                return;
            }
            consumerPromises[key][pk].splice(myIndex, 1);
            if (!consumerPromises[key][pk].length) {
                delete consumerPromises[key][pk];
            }
            if (!Object.keys(consumerPromises[key]).length) {
                // last one out, cancel the inner promise
                inflightPromises?.[key]?.[pk]?.cancel(reason);
                delete consumerPromises[key];
            }
            if (inflightPromises?.[key]?.[pk]) {
                delete inflightPromises[key][pk];
            }
            if (inflightPromises[key] && !Object.keys(inflightPromises[key]).length) {
                // this *should* be true if we cancelled the inner promise
                delete inflightPromises[key];
            }
        };
        return self;
    };

    const assignOuterPromise = (key, pk, promiseContainer) => {
        if (!consumerPromises[key]) {
            consumerPromises[key] = {};
        }
        if (!consumerPromises[key][pk]) {
            consumerPromises[key][pk] = [];
        }
        consumerPromises[key][pk].push(promiseContainer);
    };

    /**
     * The lookup context object.
     * @type {object}
     * @property {function(app:string, model:string, fields:string[], expands:string[], pk:string):import('@arrai-innovations/reactive-helpers').CancellablePromise<object>} requestObject - The function to request an object.
     */
    const lookupContext = {
        requestObject: (app, model, fields, expands, pk) => {
            const key = getLookupKey(app, model, fields, expands);
            if (results[key]?.[pk]) {
                return Promise.resolve(readonlyResults[key][pk]);
            }
            if (inflightPromises[key]?.[pk]) {
                const promise = newPromiseUnwrapper(key, pk);
                assignOuterPromise(key, pk, promise);
                return promise.promise;
            }
            if (!requestsMap.has(key)) {
                requestsMap.set(key, []);
            }
            requestsMap.get(key).push({
                app,
                model,
                fields,
                expands,
                pk: cloneDeep(pk),
            });
            if (!consumerPromises[key]) {
                consumerPromises[key] = {};
            }
            const promise = newPromiseUnwrapper(key, pk);
            scheduledRequest();
            assignOuterPromise(key, pk, promise);
            return promise.promise;
        },
    };
    provide(LookupContextSymbol, lookupContext);
    return lookupContext;
}
