<script setup>
import { useList } from "@arrai-innovations/reactive-helpers";
import Button from "@vueda/controls/button/Button.vue";
import LoadingSpinnerBlock from "@vueda/display/loading/LoadingSpinnerBlock.vue";
import PageActions from "@vueda/shell/page-title/PageActions.vue";
import "@vueda/theme/vueda-tailwind/views/ViewActivate.theme.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { usePageTitle } from "@vueda/use/usePageTitle.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { FetchError } from "@vueda/utils/errors.js";
import { getJsonOrText } from "@vueda/utils/fetchSupport.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import { getDetailUrl } from "@vueda/utils/urls.js";
import ModelActionForm from "@vueda/views/ModelActionForm.vue";
import isEmpty from "lodash-es/isEmpty.js";
import omit from "lodash-es/omit.js";
import { computed, inject, reactive, toRef, useSlots } from "vue";
import { useRouter } from "vue-router";

/**
 * View that renders a confirmation form for the activate action via ModelActionForm, then sends
 * a PATCH request to the activate endpoint when the user confirms. Contributes its title to the
 * layout's PageTitle display via usePageTitle and teleports its "Go Back" action into the title
 * action zone via PageActions, matching sibling action-router views (ViewAction,
 * ViewWorkflowTransition, ViewHistoryList).
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
    /** Django model name whose instances will be activated. */
    model: {
        type: String,
        required: true,
    },
    /** Primary key or array of primary keys identifying the instances to activate. */
    pk: {
        type: [String, Array],
        required: true,
    },
    /** Page title override; defaults to "Activate {Model}". */
    title: {
        type: String,
        default: undefined,
    },
    ...THEME_OVERRIDE_PROPS,
});

const slots = useSlots();
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
        id: Array.isArray(toRef(props, "pk")) ? toRef(props, "pk") : [toRef(props, "pk")],
    },
    intendToList: validAndActive,
});

async function executeAction({ target, pks }) {
    const abortController = new AbortController();
    const url = getDetailUrl(target.app, target.model, "activate");
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

const handleActivate = async () => {
    await instanceList.executeAction();
    if (instanceList.state.errored) {
        throw instanceList.state.error;
    }
};

const activateTitleText = computed(() => {
    return props.title?.length > 0 ? props.title : `Activate ${memoizedStartCase(props.model)}`;
});

// Contribute the page title to the layout's PageTitle display.
usePageTitle(() => ({ title: activateTitleText.value }));

const router = useRouter();
const handleReturnClick = () => {
    router.back();
};
const theme = useTheme("ViewActivate", props);
</script>

<template>
    <div :class="theme('root')" :style="theme.hideStyle?.value" v-bind="$attrs" data-qa="view-activate-root">
        <!-- The "Go Back" action teleports into the layout's PageTitle action zone. -->
        <page-actions>
            <slot label="Go Back" name="return-button" @click="handleReturnClick">
                <Button @click="handleReturnClick">Go Back</Button>
            </slot>
        </page-actions>
        <div v-if="!isEmpty(modelConfig.info)">
            <model-action-form
                action="activate"
                :app="app"
                :model="model"
                :objects="instanceList.state.objects"
                :run-action="handleActivate"
                :fetch-state="instanceList.state"
                v-bind="omit($attrs, ['class'])"
            >
                <template v-for="(_, slot) in slots" #[slot]="slotProps">
                    <slot :name="slot" v-bind="slotProps || {}" />
                </template>
            </model-action-form>
        </div>
        <div v-else><loading-spinner-block /></div>
    </div>
</template>
