/**
 * @module use/useSubForm
 * @description Creates a child form context that delegates submission and loading state to a parent form context, scoped to an optional parent path.
 */
import { del, flattenPathsWithValues, keyDiff } from "@arrai-innovations/reactive-helpers";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import get from "lodash-es/get.js";
import set from "lodash-es/set.js";
import { computed, inject, provide, reactive, readonly, toRef, unref, watch } from "vue";

/**
 * Creates a child form context that delegates submission and loading state to a parent form context, scoped to an optional path prefix.
 *
 * @param {object} options - Options for the subform.
 * @param {import('vue').Ref<string>|string} [options.parentPath] - The path to the parent form.
 * @returns {import('@vueda/use/useForm').FormContext} - The sub form context for the subform.
 */
export function useSubForm({ parentPath }) {
    /** @type {import('@vueda/use/useForm').FormContext} */
    const parentFormContext = inject(FormContextSymbol);
    const parentState = parentFormContext.state;

    /** @type {import('@vueda/use/useForm').FormContext} */
    const state = reactive({
        // *** Meta Information ***
        parentPath,

        // *** Values & Initial State ***
        values: {},
        submittingValues: toRef(parentState, "submittingValues"),
        initialValues: {},

        // *** Validation & Errors ***
        errors: {},
        anyErrors: toRef(parentState, "anyErrors"),
        messages: {},
        anyMessages: toRef(parentState, "anyMessages"),

        // *** Interaction & Focus ***
        touched: {},
        anyTouched: toRef(parentState, "anyTouched"),
        focused: computed(() => {
            // map the parent focused path to the child focused path
            const focused = parentState.focused;
            const pathPrefix = unref(parentPath);
            if (!focused?.startsWith(pathPrefix)) {
                return null;
            }
            return focused.slice(pathPrefix.length).replace(/^\./, "");
        }),

        // ** Tracking & Modification **
        modified: {},
        anyModified: toRef(parentState, "anyModified"),
        required: {},
        anyRequired: toRef(parentState, "anyRequired"),
        valid: {},

        // *** Ignored Fields & Reset Behavior ***
        ignored: {},
        anyIgnored: toRef(parentState, "anyIgnored"),

        // *** Dependency Management ***
        dependencyValues: {},
    });

    for (const nestedValues of ["values", "initialValues"]) {
        watch(
            [
                () => flattenPathsWithValues(get(parentState[nestedValues], unref(parentPath))),
                () => flattenPathsWithValues(state[nestedValues]),
            ],
            ([parent, mine]) => {
                // sync from parent to child.
                // writes originating from the child must go down via parentFormContext's updateValue or deleteValue
                const pPVO = Object.fromEntries(parent.pathValues);
                const mPVO = Object.fromEntries(mine.pathValues);
                const { addedKeys, removedKeys, sameKeys } = keyDiff(Object.keys(pPVO), Object.keys(mPVO));
                for (const key of addedKeys) {
                    set(state[nestedValues], key, pPVO[key]);
                }
                for (const key of removedKeys) {
                    del(state[nestedValues], key);
                }
                for (const key of sameKeys) {
                    if (pPVO[key] !== mPVO[key]) {
                        set(state[nestedValues], key, pPVO[key]);
                    }
                }
                // remove containers the parent no longer has
                const { removedKeys: removedContainerKeys } = keyDiff(parent.containerPaths, mine.containerPaths, {
                    sameKeys: false,
                    addedKeys: false,
                });
                for (const removedKey of removedContainerKeys) {
                    del(state[nestedValues], removedKey);
                }
            },
            { immediate: true },
        );
    }

    for (const flatList of [
        "errors",
        "messages",
        "touched",
        "modified",
        "required",
        "valid",
        "ignored",
        "dependencyValues",
    ]) {
        watch(
            () => Object.keys(parentState[flatList]).filter((key) => key.startsWith(unref(parentPath))),
            (newKeys) => {
                const reactiveFlatList = state[flatList];
                const { addedKeys, removedKeys } = keyDiff(newKeys, Object.keys(reactiveFlatList), { sameKeys: false });
                for (const key of addedKeys) {
                    reactiveFlatList[key] = toRef(parentState[flatList], key);
                }
                for (const key of removedKeys) {
                    delete reactiveFlatList[key];
                }
            },
            { immediate: true },
        );
    }

    const buildFieldMethodProxy = (parentMethod) => {
        return (localName, ...args) => {
            const fullPath = `${unref(parentPath)}${localName.startsWith("[") ? "" : "."}${localName}`;
            parentMethod(fullPath, ...args);
        };
    };

    const returnObject = {
        state: readonly(state),

        // *** Form Reset & State Management ***
        reset: parentFormContext.reset,
        getFirstErrorField: parentFormContext.getFirstErrorField,

        // *** Value & Initial Value Handling ***
        updateValue: buildFieldMethodProxy(parentFormContext.updateValue),
        deleteValue: buildFieldMethodProxy(parentFormContext.deleteValue),
        updateInitialValue: buildFieldMethodProxy(parentFormContext.updateInitialValue),
        deleteInitialValue: buildFieldMethodProxy(parentFormContext.deleteInitialValue),

        // *** Error & Message Handling ***
        clearErrors: buildFieldMethodProxy(parentFormContext.clearErrors),
        updateError: buildFieldMethodProxy(parentFormContext.updateError),
        deleteError: buildFieldMethodProxy(parentFormContext.deleteError),
        clearMessages: buildFieldMethodProxy(parentFormContext.clearMessages),
        updateMessage: buildFieldMethodProxy(parentFormContext.updateMessage),
        deleteMessage: buildFieldMethodProxy(parentFormContext.deleteMessage),
        handleServerFormValidationError: parentFormContext.handleServerFormValidationError,
        clearServerErrors: buildFieldMethodProxy(parentFormContext.clearServerErrors),

        // *** Touch & Focus Management ***
        setTouched: buildFieldMethodProxy(parentFormContext.setTouched),
        setAllTouched: parentFormContext.setAllTouched,
        clearTouched: buildFieldMethodProxy(parentFormContext.clearTouched),
        clearAllTouched: parentFormContext.clearAllTouched,
        focus: buildFieldMethodProxy(parentFormContext.focus),
        blur: buildFieldMethodProxy(parentFormContext.blur),

        // *** Ignore State Management ***
        ignore: buildFieldMethodProxy(parentFormContext.ignore),
        removeIgnore: buildFieldMethodProxy(parentFormContext.removeIgnore),

        // *** Hook Registrations ***
        registerIsModifiedHook: buildFieldMethodProxy(parentFormContext.registerIsModifiedHook),
        unregisterIsModifiedHook: buildFieldMethodProxy(parentFormContext.unregisterIsModifiedHook),
        registerIsRequiredHook: buildFieldMethodProxy(parentFormContext.registerIsRequiredHook),
        unregisterIsRequiredHook: buildFieldMethodProxy(parentFormContext.unregisterIsRequiredHook),
        registerIsValidHook: buildFieldMethodProxy(parentFormContext.registerIsValidHook),
        unregisterIsValidHook: buildFieldMethodProxy(parentFormContext.unregisterIsValidHook),
        registerIsIgnoredHook: buildFieldMethodProxy(parentFormContext.registerIsIgnoredHook),
        unregisterIsIgnoredHook: buildFieldMethodProxy(parentFormContext.unregisterIsIgnoredHook),
    };

    provide(FormContextSymbol, returnObject);
    return returnObject;
}
