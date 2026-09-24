/**
 * @module use/useViewDestroy
 * @description Provides reactive instance deletion support for a view screen, including bulk delete and error handling.
 */
import { loadingCombine, useList } from "@arrai-innovations/reactive-helpers";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { getPluralizedTitle, memoizedStartCase } from "@vueda/utils/case.js";
import { ConfirmationRequiredError } from "@vueda/utils/errors.js";
import { allPagePaginatedListCrudAdaptor } from "@vueda/utils/listCrud.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject, reactive, toRef } from "vue";

/**
 * @typedef {object} ViewDestroyState
 *
 * @property {boolean} validAndActive - Whether the current context has a valid app/model/pk and is active.
 * @property {import('@vueda/use/useModelConfig.js').ModelConfig} modelConfig - The model config for the current app/model.
 * @property {import('@arrai-innovations/reactive-helpers/use/useList.js').ListManager} instanceList - The list context of instances to destroy.
 * @property {import('vue').ComputedRef<string>} titleStr - Page title for the confirmation, counted and pluralized for a bulk destroy (e.g. "Delete Widget", "Delete 3 Widgets").
 * @property {import('vue').ComputedRef<boolean|undefined>} pageLoading - Combined loading state (model config + the fetch of the records being confirmed).
 * @property {(options: { dryRun?: boolean, acknowledgeWarnings?: string }) => Promise<void>} handleDelete - Attempts
 *  to delete the instance(s) through the list's registered `bulkDelete` handler. Throws on failure, including a
 *  `ConfirmationRequiredError` when the server gates the delete behind warning acknowledgement (HTTP 409); pass the
 *  error's digest back via `acknowledgeWarnings` to proceed. A `dryRun` validates only: the request carries the
 *  `Dry-Run` header and the list keeps its rows, so the selection survives the pre-flight.
 */

/**
 * Provides instance deletion support for a view screen.
 *
 * Internally loads the instance(s) matching the provided `pk`, then exposes a
 * `handleDelete` function that can perform bulk deletion and report errors.
 *
 * @param {{ app: string, model: string, pk: string|string[] }} props - The reactive props object.
 * @returns {ViewDestroyState} An object containing reactive state and the `handleDelete` function.
 */
export function useViewDestroy(props) {
    if (!inject(LookupContextSymbol, null)) {
        useLookupContext();
    }
    const isActive = useIsActive();
    const validAndActive = computed(
        () => !!(isActive.value && props.app && props.model && props.pk && modelConfig.loading === false),
    );
    const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));

    const instanceListProps = reactive({
        target: {
            app: toRef(props, "app"),
            model: toRef(props, "model"),
        },
        pkKey: computed(() => modelConfig.info?.pk ?? "id"),
        params: {
            id: computed(() => {
                const pk = props.pk;
                return Array.isArray(pk) ? pk : [pk];
            }),
        },
        intendToList: validAndActive,
    });
    const instanceList = useList({
        props: instanceListProps,
        handlers: {
            list: allPagePaginatedListCrudAdaptor,
        },
    });

    // "Delete", not "Destroy": the route action names the operation, but the page says what the
    // operator is doing, matching the banner below it and the copy convention for actions.
    // Pluralized and counted for a bulk destroy, so the title carries the blast radius too.
    const titleStr = computed(() => {
        const count = Array.isArray(props.pk) ? props.pk.length : 1;
        if (count > 1) {
            const plural = modelConfig.config?.verboseNamePlural || getPluralizedTitle(props.model);
            return `Delete ${count} ${memoizedStartCase(plural)}`;
        }
        return `Delete ${memoizedStartCase(modelConfig.config?.verboseName || props.model)}`;
    });
    const pageLoading = computed(() => loadingCombine(modelConfig.loading, instanceList.state.loading));

    const handleDelete = async ({ dryRun, acknowledgeWarnings }) => {
        // `keepObjects` on the dry run: a validation pass must not empty the list the operator is still confirming
        // against. A real delete leaves it off, so reactive-helpers removes the deleted rows.
        await instanceList.bulkDelete({ dryRun, acknowledgeWarnings, keepObjects: !!dryRun });
        if (instanceList.state.errored) {
            const error = instanceList.state.error;
            if (error instanceof ConfirmationRequiredError) {
                // Not a failure: the caller's confirmation flow owns it (ViewDestroy hands
                // instanceList.state to ActionForm as fetchState, which renders fetchState.error as a
                // failure banner; left in place it would show behind the confirmation dialog and
                // linger after a cancel). Clear it from the list state before rethrowing.
                instanceList.clearError();
            }
            throw error;
        }
    };
    return {
        validAndActive,
        modelConfig,
        instanceList,
        titleStr,
        pageLoading,
        handleDelete,
    };
}
