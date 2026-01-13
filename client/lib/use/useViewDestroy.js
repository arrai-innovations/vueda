import { useList } from "@arrai-innovations/reactive-helpers";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { allPagePaginatedListCrudAdaptor } from "@vueda/utils/listCrud.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject, reactive, toRef } from "vue";

/**
 * @typedef {object} ViewDestroyState
 *
 * @property {boolean} validAndActive - Whether the current context has a valid app/model/pk and is active.
 * @property {import('@vueda/use/useModelConfig.js').ModelConfig} modelConfig - The model config for the current app/model.
 * @property {import('@arrai-innovations/reactive-helpers/use/useList.js').ListManager} instanceList - The list context of instances to destroy.
 * @property {(options: { dryRun?: boolean }) => Promise<void>} handleDelete - Attempts to delete the instance(s). Throws on failure.
 */

/**
 * Provides instance deletion support for a view screen.
 *
 * Internally loads the instance(s) matching the provided `pk`, then exposes a
 * `handleDelete` function that can perform bulk deletion and report errors.
 *
 * @param {object} props - The reactive props object.
 * @param {string} props.app - The app label for the model.
 * @param {string} props.model - The model name to use.
 * @param {string|string[]} props.pk - The primary key(s) identifying the instance(s) to retrieve and delete.
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

    const handleDelete = async ({ dryRun }) => {
        await instanceList.bulkDelete({ dryRun });
        if (instanceList.state.errored) {
            throw instanceList.state.error;
        }
    };
    return {
        validAndActive,
        modelConfig,
        instanceList,
        handleDelete,
    };
}
