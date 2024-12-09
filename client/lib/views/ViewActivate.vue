<script setup>
import { useList } from "@arrai-innovations/reactive-helpers";
import ActionForm from "@vueda/components/ActionForm.vue";
import LoadingSpinnerBlock from "@vueda/components/LoadingSpinnerBlock.vue";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { FetchError } from "@vueda/utils/errors.js";
import { getJsonOrText } from "@vueda/utils/fetchSupport.js";
import { getDetailUrl } from "@vueda/utils/urls.js";
import { isArray } from "lodash-es";
import isEmpty from "lodash-es/isEmpty.js";
import { computed, reactive, toRef } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    app: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    pk: {
        type: [String, Array],
        required: true,
    },
    variant: {
        type: String,
        default: "default",
    },
    outerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
});

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

async function executeAction({ crudArgs, pks }) {
    const abortController = new AbortController();
    const url = getDetailUrl(crudArgs.app, crudArgs.model, "activate");
    const returnedPromise = fetch(url, {
        method: "PATCH",
        headers: {
            "X-CSRFToken": getCSRFValue(),
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ pks: pks }),
        signal: abortController.signal,
    }).then(async (response) => {
        if (response.status === 200) {
            return response;
        }
        throw new FetchError("Failed to activate object", response, await getJsonOrText(response));
    });
    returnedPromise.cancel = () => abortController.abort();
    return returnedPromise;
}

const instanceList = useList({
    props: instanceListProps,
    paged: false,
    functions: {
        executeAction,
    },
    keepOldPages: false,
    clearListOnListIntentTriggered: false,
});

const handleActivate = async () => {
    await instanceList.executeAction();
    if (instanceList.state.errored) {
        throw instanceList.state.error;
    }
};
</script>

<template>
    <div v-if="!isEmpty(modelConfig.info)">
        <action-form
            action="activate"
            :app="app"
            :model="model"
            :objects="instanceList.state.objects"
            :run-action="handleActivate"
            :state="instanceList.state"
        >
        </action-form>
    </div>
    <div v-else><loading-spinner-block /></div>
</template>
