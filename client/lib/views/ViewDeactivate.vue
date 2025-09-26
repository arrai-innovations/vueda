<script setup>
import { useList } from "@arrai-innovations/reactive-helpers";
import ActionForm from "@vueda/components/ActionForm.vue";
import LoadingSpinnerBlock from "@vueda/components/LoadingSpinnerBlock.vue";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { useModelConfig } from "@vueda/use/useModelConfig";
import { FIELDS_PARAM } from "@vueda/utils/constants.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { FetchError } from "@vueda/utils/errors.js";
import { getJsonOrText } from "@vueda/utils/fetchSupport.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import { getDetailUrl } from "@vueda/utils/urls.js";
import isEmpty from "lodash-es/isEmpty.js";
import { computed, inject, reactive, toRef } from "vue";

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
    () => !!(isActive.value && props.app && props.model && props.pk && modelConfig.loading === false),
);
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));

if (!inject(LookupContextSymbol, null)) {
    useLookupContext();
}

const instanceListProps = reactive({
    target: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    pkKey: computed(() => modelConfig.info?.pk ?? "id"),
    params: {
        [FIELDS_PARAM]: {},
    },
    params: {
        id: Array.isArray(toRef(props, "pk")) ? toRef(props, "pk") : [toRef(props, "pk")],
    },
    intendToList: validAndActive,
});
async function executeAction({ target, pks }) {
    const abortController = new AbortController();
    const url = getDetailUrl(target.app, target.model, "deactivate");
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
    handlers: {
        executeAction,
    },
    keepOldPages: false,
    clearListOnListIntentTriggered: false,
});

const handleDeactivate = async () => {
    await instanceList.executeAction();
    if (instanceList.state.errored) {
        throw instanceList.state.error;
    }
};
</script>

<template>
    <div v-if="!isEmpty(modelConfig.info)">
        <action-form
            action="deactivate"
            :app="app"
            :model="model"
            :objects="instanceList.state.objects"
            :run-action="handleDeactivate"
            :state="instanceList.state"
        >
        </action-form>
    </div>
    <div v-else><loading-spinner-block /></div>
</template>
