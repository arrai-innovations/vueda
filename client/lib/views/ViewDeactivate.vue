<script setup>
import { useList } from "@arrai-innovations/reactive-helpers";
import LoadingSpinnerBlock from "@vueda/components/LoadingSpinnerBlock.vue";
import ModelActionForm from "@vueda/components/ModelActionForm.vue";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { FIELDS_PARAM } from "@vueda/utils/constants.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { FetchError } from "@vueda/utils/errors.js";
import { getJsonOrText } from "@vueda/utils/fetchSupport.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import { getDetailUrl } from "@vueda/utils/urls.js";
import isEmpty from "lodash-es/isEmpty.js";
import { computed, inject, reactive, toRef } from "vue";

/**
 * View that renders a confirmation form for the deactivate action via ModelActionForm, then sends
 * a PATCH request to the deactivate endpoint when the user confirms.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    /** Django app label that owns the model. */
    app: {
        type: String,
        required: true,
    },
    /** Django model name whose instances will be deactivated. */
    model: {
        type: String,
        required: true,
    },
    /** Primary key or array of primary keys identifying the instances to deactivate. */
    pk: {
        type: [String, Array],
        required: true,
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
        body: JSON.stringify({ pks }),
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
        <model-action-form
            action="deactivate"
            :app="app"
            :model="model"
            :objects="instanceList.state.objects"
            :run-action="handleDeactivate"
            :fetch-state="instanceList.state"
            data-qa="action-form"
            v-bind="$attrs"
        >
        </model-action-form>
    </div>
    <div v-else><loading-spinner-block /></div>
</template>
