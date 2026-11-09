/**
 * @module use/useObjectChangeNotice
 * @description Reports that someone else saved or deleted the record that a form holds, without
 *   changing the form. An update view uses it, because applying a pushed change there would replace
 *   the user's unsaved edits.
 */
import isEqual from "lodash-es/isEqual.js";
import { computed, reactive } from "vue";

/**
 * @typedef {object} ObjectChangeNoticeOptions
 * @property {() => boolean} enabled - Whether to report changes at all.
 * @property {() => object} current - The form values of the record as it is saved now. The object subscription keeps the record current.
 * @property {() => object} baseline - The form values that the form opened with, or last reloaded.
 * @property {() => boolean} deleted - True when the subscription reported the record as deleted.
 * @property {() => boolean} busy - True while the view retrieves or saves. The notice stays clear meanwhile, because the baseline is about to change.
 * @property {() => void} reload - Copies the current record into the form's baseline, which resets the form.
 */

/**
 * @typedef {object} ObjectChangeNoticeRawState
 * @property {import('vue').ComputedRef<boolean>} changed - True when the saved record's form values differ from the ones the form opened with.
 * @property {import('vue').ComputedRef<boolean>} deleted - True when the record was deleted.
 */

/**
 * @typedef {import('vue').UnwrapNestedRefs<ObjectChangeNoticeRawState> & { reload: () => void }} ObjectChangeNotice -
 *  The notice state, and `reload`, which loads the saved record into the form and discards its edits.
 */

/**
 * Compare the record that the object subscription keeps current with the values the form opened with.
 *
 * The user's own save raises no notice: the view retrieves the record after a save, which resets the
 * baseline, and the notice stays clear while the view is busy.
 *
 * @param {ObjectChangeNoticeOptions} options - Getters for the record, the baseline, and the view's state.
 * @returns {ObjectChangeNotice} The notice state.
 */
export function useObjectChangeNotice(options) {
    const deleted = computed(() => options.enabled() && !!options.deleted());
    const changed = computed(
        () => options.enabled() && !deleted.value && !options.busy() && !isEqual(options.current(), options.baseline()),
    );
    return reactive({ changed, deleted, reload: () => options.reload() });
}
