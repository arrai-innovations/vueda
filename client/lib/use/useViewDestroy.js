import { useList } from "@arrai-innovations/reactive-helpers";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { isArray } from "lodash-es";
import { computed, reactive, shallowReactive, toRef } from "vue";

export function useViewDestroy(props) {
    const isActive = useIsActive();
    const validAndActive = computed(
        () => !!(isActive.value && props.app && props.model && props.pk && modelConfig.info?.pk),
    );
    const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));

    const instanceListProps = reactive({
        crudArgs: {
            app: toRef(props, "app"),
            model: toRef(props, "model"),
        },
        pkKey: computed(() => modelConfig.info?.pk ?? "id"),
        retrieveArgs: {
            f: {},
        },
        listArgs: {
            id: isArray(toRef(props, "pk")) ? toRef(props, "pk") : [toRef(props, "pk")],
        },
        intendToList: validAndActive,
    });
    const instanceList = useList({
        props: instanceListProps,
        paged: false,
        keepOldPages: false,
        clearListOnListIntentTriggered: false,
    });

    const handleDelete = async () => {
        await instanceList.bulkDelete();
        if (instanceList.state.errored) {
            throw instanceList.state.error;
        }
    };
    return shallowReactive({
        validAndActive,
        modelConfig,
        instanceList,
        handleDelete,
    });
}
