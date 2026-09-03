<script setup>
import Button from "@vueda/controls/button/Button.vue";
import PageActions from "@vueda/shell/page-title/PageActions.vue";
import { storeWorkflow } from "@vueda/stores/storeWorkflow.js";
import "@vueda/theme/vueda-tailwind/views/ViewExecuteTransition.theme.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { usePageTitle } from "@vueda/use/usePageTitle.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { useWorkflowTransitions } from "@vueda/use/useWorkflowTransitions.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import ModelActionForm from "@vueda/views/ModelActionForm.vue";
import omit from "lodash-es/omit.js";
import { computed, inject, toRef, useSlots } from "vue";
import { useRouter } from "vue-router";

/**
 * Framework confirmation view for a workflow transition code that has no project-supplied
 * override. Renders a page title with a "Go Back" button and embeds a `ModelActionForm`, whose
 * submit runs through `storeWorkflow.executeTransition` instead of the generic model-action
 * endpoint. `ViewActionRouter` resolves this as the final fallback for a recognized transition
 * code, after any `ViewAction{App}{Model}{Code}.vue` or `ViewAction{Code}.vue` project override.
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
    /** Django model name the transition belongs to. */
    model: {
        type: String,
        required: true,
    },
    /** Primary key(s) of the object(s) to transition; pass an array for a bulk transition. */
    pk: {
        type: [String, Number, Array],
        default: undefined,
    },
    /** Transition code to execute, passed through verbatim from the route. */
    action: {
        type: String,
        required: true,
    },
    /** Page title override; defaults to the transition's display name plus the model name. */
    title: {
        type: String,
        default: undefined,
    },
    ...THEME_OVERRIDE_PROPS,
});
if (!inject(LookupContextSymbol, null)) {
    useLookupContext();
}
const slots = useSlots();
const router = useRouter();
const workflow = storeWorkflow();
const workflowTransitions = useWorkflowTransitions(toRef(props, "app"), toRef(props, "model"));

const transition = computed(() => workflowTransitions.transitions?.find((t) => t.code === props.action));
// Falls back to a start-cased version of the code so copy stays readable while transitions are
// still loading, or for a code the model-level fetch does not (yet) report.
const transitionDisplayName = computed(() => transition.value?.name || memoizedStartCase(props.action));

const actionTitleText = computed(() => {
    return props.title?.length > 0 ? props.title : `${transitionDisplayName.value} ${memoizedStartCase(props.model)}`;
});
// Contribute the page title to the layout's PageTitle display.
usePageTitle(() => ({ title: actionTitleText.value }));

const handleReturnClick = () => {
    router.back();
};

/**
 * `ModelActionForm`'s default `run-action` targets the generic model-action endpoint, which does
 * not accept a `transition_code`. Overriding the attribute here (it is not a declared prop of
 * `ModelActionForm`, so it lands in `$attrs` and wins over the internal default binding) routes
 * submission through the workflow execute-transition endpoint instead, forwarding the same
 * dry-run and warning-acknowledgement arguments `ActionForm` already threads through every other
 * model action.
 *
 * @param {{formValues?: object, dryRun?: boolean, acknowledgeWarnings?: string}} [options] - Run options from `ActionForm`.
 * @returns {Promise<any>} The transition execution result.
 */
const runAction = ({ dryRun = false, acknowledgeWarnings } = {}) =>
    workflow.executeTransition(
        props.app,
        props.model,
        props.pk,
        props.action,
        router,
        undefined,
        dryRun,
        acknowledgeWarnings,
    );

const theme = useTheme("ViewExecuteTransition", props);
</script>

<template>
    <div :class="theme('root')" :style="theme.hideStyle?.value" v-bind="$attrs" data-qa="view-execute-transition-root">
        <!-- The "Go Back" action teleports into the layout's PageTitle action zone. -->
        <page-actions>
            <slot label="Go Back" name="return-button" @click="handleReturnClick">
                <Button @click="handleReturnClick">Go Back</Button>
            </slot>
        </page-actions>
        <model-action-form
            :action="action"
            :action-verbose-name="transitionDisplayName"
            :app="app"
            :model="model"
            :pk="pk"
            :run-action="runAction"
            v-bind="omit($attrs, ['class'])"
        >
            <template v-for="(_, slot) in slots" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps || {}" />
            </template>
        </model-action-form>
    </div>
</template>
