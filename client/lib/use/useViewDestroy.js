/**
 * @module use/useViewDestroy
 * @description Provides reactive instance deletion support for a view screen, including bulk delete and error handling.
 */
import { useList } from "@arrai-innovations/reactive-helpers";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
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
 * @property {(options: { dryRun?: boolean, acknowledgeWarnings?: string }) => Promise<void>} handleDelete - Attempts
 *  to delete the instance(s). Throws on failure, including a `ConfirmationRequiredError` when the server gates the
 *  delete behind warning acknowledgement (HTTP 409); pass the error's digest back via `acknowledgeWarnings` to
 *  proceed.
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

    const handleDelete = async ({ dryRun, acknowledgeWarnings }) => {
        await instanceList.bulkDelete({ dryRun, acknowledgeWarnings });
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
        handleDelete,
    };
}
