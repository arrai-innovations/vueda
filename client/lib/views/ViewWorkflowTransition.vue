<script setup>
import Button from "@vueda/controls/button/Button.vue";
import FormConfirmDialog from "@vueda/form/confirm/FormConfirmDialog.vue";
import LinkModelView from "@vueda/navigation/link-model-view/LinkModelView.vue";
import PageActions from "@vueda/shell/page-title/PageActions.vue";
import { storeWorkflow } from "@vueda/stores/storeWorkflow.js";
import "@vueda/theme/vueda-tailwind/views/ViewWorkflowTransition.theme.js";
import { useConfirmationController } from "@vueda/use/useConfirmationController.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { usePageTitle } from "@vueda/use/usePageTitle.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { getAppModelDotName, memoizedStartCase } from "@vueda/utils/case.js";
import { ConfirmationRequiredError } from "@vueda/utils/errors.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import isEmpty from "lodash-es/isEmpty.js";
import { computed, inject, ref, toRef, watch } from "vue";
import { useRouter } from "vue-router";
import { toast } from "vue-sonner";

/**
 * View that lists the available workflow transitions for one or more model instances and allows
 * the user to select and execute a transition. Mounts its own `FormConfirmDialog` bound to a
 * `useConfirmationController` instance, so a transition the server gates behind advisory warnings
 * (HTTP 409) prompts the user before applying; confirming retries once with the warnings
 * acknowledged, cancelling leaves the transition unapplied.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /** Django app label that owns the model. */
    app: {
        type: String,
        required: true,
    },
    /** Django model name whose workflow transitions will be listed. */
    model: {
        type: String,
        required: true,
    },
    /** Primary key or array of primary keys of the instances to transition. */
    pk: {
        type: [String, Array],
        required: true,
    },
    /** Additional CSS classes applied to the root element. */
    class: {
        type: [String, Array, Object],
        default: () => [],
    },
});
const workflow = storeWorkflow();
const router = useRouter();
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const theme = useTheme("ViewWorkflowTransition", props);
const icon = useIcons("ViewWorkflowTransition", props);

if (!inject(LookupContextSymbol, null)) {
    useLookupContext();
}

const appModelKey = computed(() => getAppModelDotName({ app: props.app, model: props.model }));
const titleStr = computed(() => {
    return `Transitions for ${memoizedStartCase(modelConfig.info?.verbose_name)}`;
});

// Contribute the page title and loading state to the layout's PageTitle display.
usePageTitle(() => ({ title: titleStr.value, loading: workflow.loading }));

const selectedAction = ref(null);

const confirmation = useConfirmationController({
    noConsumerWarning:
        "ViewWorkflowTransition: a transition returned warnings that require confirmation, but no dialog is " +
        "bound to the confirmation controller; treating it as cancelled.",
});

const transitionsForPk = (pk) => {
    const entry = workflow.objectTransitions?.[appModelKey.value]?.[pk];
    return entry?.transitions || [];
};

const currentStateName = computed(() => {
    if (!appModelKey.value || Array.isArray(props.pk) || !props.pk) {
        return null;
    }
    return workflow.objectStates?.[appModelKey.value]?.[props.pk]?.state?.name || null;
});

const emptyTitleStr = computed(() => {
    return currentStateName.value
        ? `No transitions available from ${currentStateName.value}.`
        : "No transitions available.";
});

const availableTransitions = computed(() => {
    if (!appModelKey.value) {
        return [];
    }
    if (Array.isArray(props.pk)) {
        if (props.pk.length === 0) {
            return [];
        }
        let common = transitionsForPk(props.pk[0]);
        for (const pk of props.pk.slice(1)) {
            const codes = new Set(transitionsForPk(pk).map((t) => t.code));
            common = common.filter((t) => codes.has(t.code));
        }
        return common;
    }
    return transitionsForPk(props.pk);
});

watch(
    [() => props.app, () => props.model, () => props.pk],
    async ([app, model, pk]) => {
        if (!app || !model || isEmpty(pk)) {
            return;
        }
        if (Array.isArray(pk)) {
            for (const id of pk) {
                await workflow.fetchObjectTransitions(app, model, id);
            }
            return;
        }
        await Promise.all([workflow.fetchObjectTransitions(app, model, pk), workflow.fetchObjectState(app, model, pk)]);
    },
    { immediate: true },
);

// Performs one transition attempt. On a ConfirmationRequiredError (server 409: valid but
// unacknowledged warnings) it asks the confirmation controller and, if the user confirms, retries
// once with the warnings digest acknowledged; a changed warning set yields a new digest and
// re-prompts, so this recurses until a clean run, a real error, or a cancel. Resolves to whether
// the transition was applied (false on cancel, leaving the transition unapplied).
const performTransition = async (acknowledgeWarnings) => {
    try {
        if (acknowledgeWarnings) {
            await workflow.executeTransition(
                props.app,
                props.model,
                props.pk,
                selectedAction.value,
                router,
                undefined,
                false,
                acknowledgeWarnings,
            );
        } else {
            await workflow.executeTransition(props.app, props.model, props.pk, selectedAction.value, router);
        }
        return true;
    } catch (error) {
        if (error instanceof ConfirmationRequiredError && error.digest != null) {
            const confirmed = await confirmation.request(error.messages);
            if (confirmed) {
                return await performTransition(error.digest);
            }
            return false;
        }
        throw error;
    }
};

const handleSubmit = async () => {
    try {
        if (!selectedAction.value || typeof selectedAction.value !== "string") {
            throw new Error("ViewWorkflowTransition: selected transition code is missing or invalid.");
        }
        if (!props.pk) {
            return;
        }
        const applied = await performTransition();
        if (!applied) {
            // Cancelled at the confirmation dialog: not a failure, leave the transition unapplied.
            return;
        }
        toast.success("transition succeeded");
        router.back();
    } catch (error) {
        toast.error("transition failed");
    }
};
</script>

<template>
    <div :class="props.class" :style="theme.hideStyle?.value">
        <!-- The Return-to-List link teleports into the layout's PageTitle action zone. -->
        <page-actions>
            <div :class="theme('buttons')">
                <link-model-view
                    :app="app"
                    :class="theme('returnLink')"
                    label="Return to List"
                    :model="model"
                    view="list"
                />
            </div>
        </page-actions>
        <div :class="theme('inner')">
            <div v-if="availableTransitions.length">
                <div v-if="currentStateName" :class="theme('current')">
                    <span :class="theme('currentLabel')">Currently</span>
                    <span :class="theme('currentPill')">{{ currentStateName }}</span>
                </div>
                <form @submit.prevent="handleSubmit">
                    <div :class="theme('list')">
                        <label
                            v-for="transition in availableTransitions"
                            :key="transition.code"
                            :for="transition.code"
                            :class="theme('option')"
                            :data-selected="selectedAction === transition.code || undefined"
                            :data-disabled="transition.disabled || undefined"
                        >
                            <input
                                :id="transition.code"
                                v-model="selectedAction"
                                type="radio"
                                name="workflow-transition"
                                :value="transition.code"
                                :disabled="transition.disabled"
                                :class="theme('optionRadio')"
                            />
                            <span :class="theme('optionName')">{{ transition.name }}</span>
                            <span v-if="transition.description" :class="theme('optionDesc')">{{
                                transition.description
                            }}</span>
                            <span
                                v-if="transition.target_state_label"
                                :class="theme('optionTarget')"
                                :data-tone="transition.target_state_tone || 'neutral'"
                                >{{ transition.target_state_label }}</span
                            >
                            <span
                                v-if="transition.disabled && transition.disabled_reason"
                                :class="theme('optionDesc')"
                                >{{ transition.disabled_reason }}</span
                            >
                        </label>
                    </div>
                    <Button :disabled="!selectedAction" type="submit" tone="primary">execute transition</Button>
                </form>
            </div>
            <div v-else :class="theme('empty')" data-qa="view-workflow-transition-empty">
                <div :class="theme('emptyIcon')" aria-hidden="true">
                    <component :is="icon('flag').component" v-if="icon('flag')" v-bind="icon('flag').props" />
                </div>
                <strong :class="theme('emptyTitle')">{{ emptyTitleStr }}</strong>
                <p :class="theme('emptyDesc')">
                    There are no further actions for this
                    {{ memoizedStartCase(modelConfig.info?.verbose_name) }}.
                </p>
                <div :class="theme('emptyAction')">
                    <Button emphasis="ghost" @click="router.back()">Back to detail view</Button>
                </div>
            </div>
        </div>
        <!-- Resolves submit-time warning confirmations (HTTP 409); without it warned transitions would be cancelled. -->
        <form-confirm-dialog :controller="confirmation" />
    </div>
</template>
