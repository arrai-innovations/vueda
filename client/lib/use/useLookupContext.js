import { CancellablePromise, deepUnref, useList, useObject } from "@arrai-innovations/reactive-helpers";
import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";
import { getAppModelDotName } from "@vueda/utils/case.js";
import { EXPAND_PARAM, FIELDS_PARAM } from "@vueda/utils/constants.js";
import { allPagePaginatedListCrudAdaptor } from "@vueda/utils/listCrud.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import debounce from "lodash-es/debounce.js";
import isEqual from "lodash-es/isEqual.js";
import { effectScope, nextTick, provide, reactive, readonly } from "vue";

export function useLookupContext() {
    const es = effectScope();
    /** @typedef {{
     *     promise: import('@arrai-innovations/reactive-helpers').CancellablePromise<object>,
     *     resolve: (value: object) => void,
     *     reject: (reason?: any) => void,
     *     id: number,
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
    /** @typedef {{app:string, model:string, fields:string[], expand:string[], pk:string}} Request */
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
    /**
     * Acquire or reuse an instance of the object or list manager.
     *
     * @private
     * @param {boolean} isList
     * @param {object} args
     * @returns {Promise<{ props: object, instance: import('@vueda/reactive-helpers/use/useList.js').ListManager|import('@vueda/reactive-helpers/use/useObject.js').ObjectManager }>}
     */
    async function acquireManager({ isList, args }) {
        const pool = isList ? idleLists : idleObjects;
        const busy = isList ? busyLists : busyObjects;
        let entry = pool.pop();

        const pkKey =
            (await storeModelConfig()
                .getConfig(args)
                .then((c) => c.info?.pk ?? "id")) + "";

        if (!entry) {
            // Create a new instance
            entry = es.run(() => {
                if (isList) {
                    const listProps = reactive({
                        target: { app: args.app + "", model: args.model + "" },
                        pkKey,
                        params: {
                            id: ["dummy"],
                        },
                    });

                    // @ts-ignore - prop type shenanigans
                    // noinspection JSCheckFunctionSignatures
                    const instance = useList({
                        props: listProps,
                        handlers: {
                            list: allPagePaginatedListCrudAdaptor,
                        },
                        paged: false,
                        keepOldPages: false,
                        clearListOnListIntentTriggered: false,
                    });

                    return { props: listProps, instance };
                } else {
                    const objectProps = reactive({
                        target: { app: args.app + "", model: args.model + "" },
                        pkKey,
                        pk: "dummy",
                        params: {},
                    });

                    // @ts-ignore - prop type shenanigans
                    // noinspection JSCheckFunctionSignatures
                    const instance = useObject({ props: objectProps, handlers: {} });

                    return { props: objectProps, instance };
                }
            });
        } else {
            // Reuse the manager
            entry.props.pkKey = pkKey;
            entry.props.target.app = args.app + "";
            entry.props.target.model = args.model + "";
        }
        busy.push(entry);
        // settle some reactive assignments
        await nextTick();
        return entry;
    }

    /**
     * Do the actual list() or retrieve() call, and capture its cancel function.
     * @private
     * @param {object} args
     * @param {string[]} args.fields
     * @param {string[]} args.expand
     * @param {object} entry
     * @param {object} entry.props
     * @param {object} entry.instance
     * @param {boolean} isList
     * @param {string} key
     * @param {string[]} pks
     * @returns {import('@arrai-innovations/reactive-helpers').CancellablePromise<boolean>|import('@arrai-innovations/reactive-helpers').MaybeCancellablePromise<never>} - true if the request was successful, false otherwise.
     */
    function runRequestBatch({ fields, expand }, { props, instance }, isList, key, pks) {
        // ### This function cannot be async, or we'll lose the ability to cancel the request. ###
        try {
            if (!props.params) {
                props.params = {};
            }
            if (isList) {
                if (!props.params) {
                    props.params = {};
                }
                if (!props.params.id) {
                    props.params.id = [];
                } else {
                    props.params.id.length = 0;
                }
                props.params.id.push(...pks);
            } else {
                props.pk = pks[0] + "";
            }
            props.params[FIELDS_PARAM] = deepUnref(fields);
            props.params[EXPAND_PARAM] = deepUnref(expand);
            if (
                props.target.app !== instance.state.crud.args.app ||
                props.target.model !== instance.state.crud.args.model ||
                props.pkKey !== instance.state.crud.args.pkKey ||
                (isList
                    ? !isEqual(props.params.id, instance.state.params.id)
                    : props.params.pk !== instance.state.params.pk) ||
                !isEqual(props.params[FIELDS_PARAM], instance.state.params[FIELDS_PARAM]) ||
                !isEqual(props.params[EXPAND_PARAM], instance.state.params[EXPAND_PARAM])
            ) {
                // HACK: this is a workaround for whatever reactivity mess is going on here
                instance.state.crud.args.app = props.target.app;
                instance.state.crud.args.model = props.target.model;
                instance.state.crud.args.pkKey = props.pkKey;
                if (isList) {
                    instance.state.params.id = props.params.id;
                    instance.state.params[FIELDS_PARAM] = props.params[FIELDS_PARAM];
                    instance.state.params[EXPAND_PARAM] = props.params[EXPAND_PARAM];
                } else {
                    instance.state.pk = props.pk;
                    instance.state.params[FIELDS_PARAM] = props.params[FIELDS_PARAM];
                    instance.state.params[EXPAND_PARAM] = props.params[EXPAND_PARAM];
                }
            }
            return isList ? instance.list() : instance.retrieve();
        } catch (e) {
            console.error("[runRequestBatch] Error in request:", e);
            return CancellablePromise.reject(e);
        }
    }

    /**
     * Called whenever someone adds a request to requestsMap.
     * @returns {Promise<void>}
     */
    const scheduledRequest = debounce(
        () => {
            const localRequests = cloneDeep([...requestsMap.entries()]);
            requestsMap.clear();
            for (const [key, /** @type{Request[]} */ requests] of localRequests) {
                const pks = Array.from(new Set(requests.map((r) => r.pk)));
                /** @type {Request} */
                const args = requests[0];
                const isList = requests.length > 1;

                if (!pks.some((pk) => consumerPromises[key]?.[pk]?.length)) {
                    console.warn("[scheduledRequest] skipped request, no consumers", key, pks, requests);
                    continue;
                }
                let instanceCancel = null;
                const batchPromise = CancellablePromise(
                    (async () => {
                        const entry = await acquireManager({
                            isList,
                            args,
                            pks,
                        });
                        try {
                            const outcomePromise = runRequestBatch(args, entry, isList, key, pks);
                            instanceCancel = outcomePromise.cancel;
                            const outcome = await outcomePromise;

                            if (!results[key]) {
                                results[key] = {};
                            }

                            for (const pk of pks) {
                                results[key][pk] = cloneDeep(
                                    isList ? entry.instance.state.objects[pk] : entry.instance.state.object,
                                );

                                const consumers = consumerPromises?.[key]?.[pk];
                                if (!consumers) {
                                    console.warn(
                                        "[scheduledRequest] No consumers for this request",
                                        key,
                                        pk,
                                        consumerPromises,
                                    );
                                    continue;
                                }
                                for (const consumer of consumers) {
                                    if (!outcome) {
                                        consumer.reject(entry.instance.state.error);
                                        continue;
                                    }
                                    consumer.resolve(readonlyResults[key][pk]);
                                }
                            }
                            return outcome;
                        } catch (err) {
                            console.error("[scheduledRequest] Error in runRequestBatch:", err);
                            for (const pk of pks) {
                                const consumers = consumerPromises?.[key]?.[pk];
                                if (!consumers?.length) {
                                    console.error(
                                        "[scheduledRequest] No consumers for request rejection",
                                        key,
                                        pk,
                                        consumerPromises,
                                        err,
                                    );
                                    continue;
                                }
                                for (const consumer of consumers) {
                                    consumer.reject(err);
                                }
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
                            // noinspection ES6MissingAwait
                            nextTick(() => {
                                // Defer cleanup to avoid race condition with immediate re-request for the same key
                                if (consumerPromises[key] && !Object.keys(consumerPromises[key]).length) {
                                    delete consumerPromises[key];
                                }
                                if (inflightPromises[key] && !Object.keys(inflightPromises[key]).length) {
                                    delete inflightPromises[key];
                                }
                            });

                            if (isList) {
                                entry.instance.clearList();
                                idleLists.push(entry);
                            } else {
                                entry.instance.clear();
                                idleObjects.push(entry);
                            }
                        }
                    })(),
                    async (reason = "Cancelled") => {
                        try {
                            try {
                                if (instanceCancel) {
                                    await instanceCancel?.(reason); // or whatever cancel logic applies
                                    instanceCancel = null; // make idempotent
                                }
                            } catch (e) {
                                console.warn("[batchPromise] cancel failed", e);
                            }
                        } catch (e) {
                            console.warn("[scheduledRequest] cancel failed", e);
                        }
                    },
                );
                if (!inflightPromises[key]) {
                    inflightPromises[key] = {};
                }
                for (const pk of pks) {
                    inflightPromises[key][pk] = batchPromise;
                }
            }
        },
        250,
        { maxWait: 1000 },
    );

    const getLookupKey = (app, model, fields, expand) => {
        const appModelDotName = getAppModelDotName({ app, model });
        const fieldKey = [...(fields || [])].sort().join(",");
        const expandKey = [...(expand || [])].sort().join(",");
        return `${appModelDotName}/${fieldKey}/${expandKey}`;
    };

    let promiseId = 0;

    const newPromiseUnwrapper = (key, pk) => {
        let resolve, reject;
        const innerPromise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        const self = /** @type {PerConsumerPromise} */ {
            promise: CancellablePromise(innerPromise, async (reason = "Lookup cancelled") => {
                if (!consumerPromises[key]?.[pk]) {
                    console.trace("cancel called after consumerPromises already cleaned up", key, pk);
                    return;
                }
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
                    // await inflightPromises?.[key]?.[pk]?.cancel(reason);
                    if (inflightPromises[key]?.[pk]) {
                        await inflightPromises[key][pk].cancel(reason);
                    } else {
                        console.warn("[cancel] No inflightPromise yet for", key, pk, "- skipping cancel");
                    }
                    delete consumerPromises[key];
                }
                if (inflightPromises?.[key]?.[pk]) {
                    delete inflightPromises[key][pk];
                }
                if (inflightPromises[key] && !Object.keys(inflightPromises[key]).length) {
                    // this *should* be true if we cancelled the inner promise
                    delete inflightPromises[key];
                }
            }),
            resolve,
            reject,
            id: ++promiseId,
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
     * @property {function(app:string, model:string, fields:string[], expand:string[], pk:string):import('@arrai-innovations/reactive-helpers').CancellablePromise<object>} requestObject - The function to request an object.
     */
    const lookupContext = {
        /**
         * Request an object from the server.
         *
         * @param {string} app - The app name, used in URL construction and request keying.
         * @param {string} model - The model name, used in URL construction and request keying.
         * @param {string} pk - The primary key of the object to request.
         * @param {string[]} fields - The fields to include in the request.
         * @param {string[]} expand - The expand names to include in the request.
         * @returns {Promise<object>} - A cancellable promise that resolves to the requested object.
         */
        requestObject: (app, model, pk, fields, expand) => {
            pk = pk + ""; // ensure pk is a string, matters to Map, unlike Object
            const key = getLookupKey(app, model, fields, expand);
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
                expand,
                pk,
            });
            const promise = newPromiseUnwrapper(key, pk);
            assignOuterPromise(key, pk, promise);
            scheduledRequest();
            return promise.promise;
        },
    };
    provide(LookupContextSymbol, lookupContext);
    return lookupContext;
}
