/**
 * @module use/useObjectChangeNotice
 * @description Reports that someone else saved or deleted the record that a view holds, without
 *   changing what the view shows. An update view uses it, because a refetch there would replace the
 *   user's unsaved edits.
 */
import { defaultObjectRetrieve } from "@vueda/utils/objectCrud.js";
import { objectStreamsEnabled, watchObjectChanges } from "@vueda/utils/objectStreams.js";
import isEqual from "lodash-es/isEqual.js";
import { computed, reactive, ref, watch } from "vue";

/**
 * @typedef {object} ObjectChangeNoticeOptions
 * @property {() => boolean} enabled - Whether to watch at all, for example while the view is active and has its record.
 * @property {() => { app: string, model: string }} target - The app label and model name of the record.
 * @property {() => string|number} pk - The primary key of the record.
 * @property {() => object} params - The params of the view's own retrieve. The check fetches with the same params, so its result compares field for field.
 * @property {() => object} object - The record that the view holds.
 * @property {() => boolean} busy - True while the view retrieves or saves. A check waits until it is false.
 * @property {() => void} reload - Retrieves the record again into the view.
 */

/**
 * @typedef {object} ObjectChangeNoticeRawState
 * @property {import('vue').Ref<boolean>} changed - True when the saved record differs from the record that the view holds.
 * @property {import('vue').Ref<boolean>} deleted - True when the record was deleted.
 */

/**
 * @typedef {import('vue').UnwrapNestedRefs<ObjectChangeNoticeRawState> & { reload: () => void }} ObjectChangeNotice -
 *  The notice state, and `reload`, which clears the notice and retrieves the record into the view.
 */

/**
 * Watch one record for changes that other people save, and report them without applying them.
 *
 * After each change message, the composable fetches the record in the background with the view's
 * own params and compares it with the record that the view holds. It sets `changed` only when they
 * differ. The user's own save therefore raises no notice: the view retrieves the saved record after
 * a save, and the check waits while the view is busy. A delete message sets `deleted` without a
 * fetch. Nothing happens before `setupObjectStreams()`.
 *
 * @param {ObjectChangeNoticeOptions} options - Getters for the record and the view's state.
 * @returns {ObjectChangeNotice} The notice state.
 */
export function useObjectChangeNotice(options) {
    const changed = ref(false);
    const deleted = ref(false);
    const busy = computed(() => !!options.busy());
    let checkPending = false;
    /** @type {(Promise<object> & { cancel?: () => any })|null} */
    let checkRequest = null;

    function cancelCheck() {
        const request = checkRequest;
        checkRequest = null;
        request?.cancel?.();
    }

    function checkWhenIdle() {
        if (!checkPending || busy.value || changed.value || deleted.value) {
            return;
        }
        checkPending = false;
        cancelCheck();
        const request = defaultObjectRetrieve({ target: options.target(), pk: options.pk(), params: options.params() });
        checkRequest = request;
        request.then(
            (data) => {
                if (checkRequest !== request) {
                    return;
                }
                checkRequest = null;
                if (busy.value) {
                    // The view started a retrieve or a save, so the record it holds is about to change.
                    checkPending = true;
                    return;
                }
                if (!isEqual(data, options.object())) {
                    changed.value = true;
                }
            },
            () => {
                if (checkRequest === request) {
                    checkRequest = null;
                }
            },
        );
    }

    // A string key, so the subscription restarts only when the record itself changes.
    watch(
        () => {
            if (!options.enabled() || !objectStreamsEnabled()) {
                return "";
            }
            const { app, model } = options.target();
            return JSON.stringify([app, model, String(options.pk())]);
        },
        (key, _previous, onCleanup) => {
            changed.value = false;
            deleted.value = false;
            if (!key) {
                return;
            }
            const [app, model, pk] = JSON.parse(key);
            const stop = watchObjectChanges({ target: { app, model }, pk }, (message) => {
                if (message.type === "event" && message.facet === "object" && message.op === "deleted") {
                    cancelCheck();
                    deleted.value = true;
                    return;
                }
                checkPending = true;
                checkWhenIdle();
            });
            onCleanup(() => {
                stop();
                cancelCheck();
                checkPending = false;
            });
        },
        { immediate: true },
    );

    watch(busy, checkWhenIdle);

    return reactive({
        changed,
        deleted,
        reload: () => {
            changed.value = false;
            options.reload();
        },
    });
}
