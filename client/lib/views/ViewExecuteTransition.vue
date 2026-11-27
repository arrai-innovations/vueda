<script setup>
import Button from "@vueda/controls/button/Button.vue";
import PageActions from "@vueda/shell/page-title/PageActions.vue";
import { storeWorkflow } from "@vueda/stores/storeWorkflow.js";
import "@vueda/theme/vueda-tailwind/views/ViewExecuteTransition.theme.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { usePageTitle } from "@vueda/use/usePageTitle.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { useWorkflowTransitions } from "@vueda/use/useWorkflowTransitions.js";
import { getLowerTitle, memoizedStartCase } from "@vueda/utils/case.js";
import { getModelVerboseName, normalizePks } from "@vueda/utils/modelAction.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import ModelActionForm from "@vueda/views/ModelActionForm.vue";
import omit from "lodash-es/omit.js";
import { computed, inject, ref, toRef, useSlots, watch } from "vue";
import { useRouter } from "vue-router";

/**
 * Framework confirmation view for a workflow transition code that has no project-supplied
 * override. Renders a page title with a "Go Back" button and embeds a `ModelActionForm`, whose
 * submit runs through `storeWorkflow.executeTransition` instead of the generic model-action
 * endpoint. `ViewActionRouter` resolves this as the final fallback for a recognized transition
 * code, after any `ViewAction{App}{Model}{Code}.vue` or `ViewAction{Code}.vue` project override.
 *
 * The dry run, which runs when the page opens, reports the transition's target state, each selected
 * object's state, and each object that the server refuses. The banner names the target state and the
 * states that the objects are in now. A confirm that the server refuses reports more refused objects,
 * such as an object that changed state after the page opened. The page skips refused objects instead
 * of blocking the confirm button. The selected count and the button label count only the objects that
 * can move, and the request sends only those. An object that is already in the transition's target
 * state shows the server's message in the info color. Every other refused object shows its message as
 * an error. The confirm button is disabled when no selected object can move. A project can replace
 * the banner text with the `banner-description` attribute.
 *
 * A transition confirmation submits no form values: `run-action` forwards only the dry-run and
 * warning-acknowledgement arguments to `storeWorkflow.executeTransition`. A project supplying
 * fields through the `extra-fields` slot renders and validates them, but their values never reach
 * the request; forward them through a project-supplied override instead.
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
    /**
     * Page title override. The default title is the transition's display name as written, followed by the model's
     * verbose name. Until the workflow metadata supplies the display name, the default uses the start-cased transition
     * code. When `pk` lists more than one object, the default uses the verbose plural name. The default is empty until
     * the verbose name is known, so the layout shows a skeleton.
     */
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
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));

const transition = computed(() => workflowTransitions.transitions?.find((t) => t.code === props.action));
// Falls back to a start-cased version of the code so copy stays readable while transitions are
// still loading, or for a code the model-level fetch does not (yet) report.
const transitionDisplayName = computed(() => transition.value?.name || memoizedStartCase(props.action));

// The selected primary keys as strings, read as `useModelAction` reads `pk`.
const selectedPks = computed(() => normalizePks(props.pk).map(String));
// More than one selected object.
const bulk = computed(() => selectedPks.value.length > 1);

// The display name is text that a person wrote, so the title shows it as written: start-casing it would
// drop punctuation ("Re-open" would read "Re Open"). Only the fallback above, built from the code, is
// start-cased. Empty until the model's verbose name is known, so PageTitle shows a skeleton instead of a
// guessed label.
const actionTitleText = computed(() => {
    if (props.title?.length > 0) {
        return props.title;
    }
    const verboseName = memoizedStartCase(
        bulk.value ? modelConfig.config?.verboseNamePlural : modelConfig.config?.verboseName,
    );
    return verboseName ? `${transitionDisplayName.value} ${verboseName}` : "";
});
// `useModelAction` consumes `action-verbose-name` as `actionVerboseNameLowerCase` and interpolates it
// mid-sentence in the confirm prompt ("Are you sure you want to {verb} the selected {model}?"),
// exactly as it does the default `getLowerTitle(props.action)` value this replaces. The page title
// above uses `transitionDisplayName` as written; only the confirm-prompt copy needs the lower case.
const transitionVerboseName = computed(() => getLowerTitle(transitionDisplayName.value));
// Contribute the page title to the layout's PageTitle display.
usePageTitle(() => ({ title: actionTitleText.value }));

const handleReturnClick = () => {
    router.back();
};

// The objects that the server refused, keyed by primary key. Each entry holds the server's messages and whether the
// object is already in the target state.
const refusedObjects = ref(Object.create(null));
// The transition's target state, and each selected object's state keyed by primary key. A run that reports objects
// fills it. Null until one answers.
const stateContext = ref(null);
// Bumped whenever the target changes, so a run that answers for an earlier target records nothing.
let outcomeGeneration = 0;
// Keyed by the same normalized primary keys that `useModelAction` reads from `pk` when no `fetchState` is passed, so
// this state resets when a new dry run starts, and not when a parent passes an equal selection again.
watch(
    () => JSON.stringify([props.app, props.model, props.action, selectedPks.value]),
    () => {
        outcomeGeneration += 1;
        refusedObjects.value = Object.create(null);
        stateContext.value = null;
    },
);
const skippedPks = computed(() => Object.keys(refusedObjects.value));
// The selected objects that a confirm sends. A Set, not `in`, so a key such as "constructor" is never mistaken for a
// refused one.
const movingPks = computed(() => {
    const skipped = new Set(skippedPks.value);
    return selectedPks.value.filter((pk) => !skipped.has(pk));
});
const pkNotices = computed(() => {
    const notices = Object.create(null);
    for (const [pk, refusal] of Object.entries(refusedObjects.value)) {
        if (refusal.alreadyInTargetState) {
            notices[pk] = refusal.errors[0];
        }
    }
    return notices;
});

// The model's name as the form's own copy writes it, so the banner and the confirm prompt name it the same way.
const modelVerboseName = computed(() => getModelVerboseName(modelConfig.info, props.model, bulk.value));
const stateListFormat = new Intl.ListFormat("en", { type: "disjunction" });
// The banner names where the transition moves the objects that it runs on, and where they are now. Skipped objects
// do not move, so their states stay out, and so do the states of objects that are not selected. Until a run reports
// the states, the form keeps its default description.
const bannerDescription = computed(() => {
    const context = stateContext.value;
    if (!context?.targetState) {
        return undefined;
    }
    const name = modelVerboseName.value;
    const target = context.targetState.name;
    // The skipped list decides which objects move, as it does for the confirm button's count.
    const moving = movingPks.value;
    if (moving.length === 0) {
        const refusals = Object.values(refusedObjects.value);
        const allAlreadyThere = refusals.length > 0 && refusals.every((refusal) => refusal.alreadyInTargetState);
        if (allAlreadyThere) {
            return bulk.value
                ? `All of the selected ${name} are already in ${target}.`
                : `The selected ${name} is already in ${target}.`;
        }
        return bulk.value
            ? `None of the selected ${name} can move to ${target}.`
            : `The selected ${name} cannot move to ${target}.`;
    }
    const subject =
        moving.length < selectedPks.value.length ? `${moving.length} of the selected ${name}` : `the selected ${name}`;
    const sourceStates = moving.map((pk) => context.states[pk]);
    // An object with no reported state has no name to give, so the banner names no source rather than a wrong one.
    if (sourceStates.some((state) => !state?.name)) {
        return `Moves ${subject} to ${target}.`;
    }
    const sourceNames = [...new Set(sourceStates.map((state) => state.name))];
    if (sourceNames.length === 1) {
        return `Moves ${subject} from ${sourceNames[0]} to ${target}.`;
    }
    return `Moves ${subject} to ${target}. They are now in ${stateListFormat.format(sourceNames)}.`;
});

/**
 * Records a run's body of objects.
 *
 * A dry run sends every selected object, so its refusals and states replace the earlier ones. A dry run that answers
 * without a body of objects clears them. A confirm sends only the objects that were not skipped, so its refusals join
 * the earlier ones, and its states update the objects that it reports. A confirm that answers without a body of
 * objects, such as a single-object confirm, changes nothing. A refusal marked `locked` never joins the skipped
 * objects, because the same request can succeed once the lock is released.
 *
 * @param {object|undefined} body - The response body, or the body of the error that the store rejected with.
 * @param {boolean} dryRun - Whether the run was a dry run.
 * @private
 */
const recordOutcome = (body, dryRun) => {
    const objects = body?.objects;
    if (!dryRun && !objects) {
        return;
    }
    // Maps without a prototype, so a key such as "__proto__" stays an ordinary key.
    const refused = Object.assign(Object.create(null), dryRun ? {} : refusedObjects.value);
    const states = Object.assign(Object.create(null), dryRun ? {} : stateContext.value?.states);
    for (const [pk, entry] of Object.entries(objects ?? {})) {
        states[pk] = entry?.state ?? null;
        if (entry?.errors && !entry.locked) {
            refused[pk] = { errors: entry.errors, alreadyInTargetState: !!entry.already_in_target_state };
        }
    }
    refusedObjects.value = refused;
    // A confirm may report objects without the target; a dry run reports its own or clears it.
    const targetState = dryRun ? body?.target_state : (body?.target_state ?? stateContext.value?.targetState);
    stateContext.value = objects && targetState ? { targetState, states } : null;
};

/**
 * `ModelActionForm`'s default request targets the generic model-action endpoint, which does not
 * accept a `transition_code`. Passing `run-action` sends the request through the workflow
 * execute-transition endpoint instead, with the same dry-run and warning-acknowledgement arguments
 * that `ActionForm` passes to every other model action. A transition code is not a model action,
 * so model info gives it no request method; `run-action` also tells the form not to require one.
 *
 * A dry run sends a list of primary keys, even for one object, because only the bulk response names
 * the target state and each object's state. The single-object route runs the same eligibility checks.
 * When `pk` is an array, a confirm sends a list of the objects that no run has refused. When `pk` is a
 * single primary key, a confirm sends it alone, so the response keeps the single-object shape. With no
 * primary key selected, the dry run passes none, so the store rejects it.
 *
 * @param {{dryRun?: boolean, acknowledgeWarnings?: string}} [options] - Run options from `ActionForm`. `formValues`
 *  is not in this signature: this view submits no form values (see the component doc block above).
 * @returns {Promise<any>} The transition execution result.
 */
const runAction = ({ dryRun = false, acknowledgeWarnings } = {}) => {
    let objectPk;
    if (dryRun) {
        objectPk = selectedPks.value.length > 0 ? selectedPks.value : undefined;
    } else if (Array.isArray(props.pk)) {
        objectPk = movingPks.value;
    } else {
        objectPk = selectedPks.value[0];
    }
    const generation = outcomeGeneration;
    const request = workflow.executeTransition(
        props.app,
        props.model,
        objectPk,
        props.action,
        router,
        undefined,
        dryRun,
        acknowledgeWarnings,
    );
    // The form awaits the request itself, so a rejection still reaches it. This branch only records the outcome.
    // A successful confirm records nothing, so the banner keeps its text while the form redirects.
    request.then(
        (body) => {
            if (dryRun && generation === outcomeGeneration) {
                recordOutcome(body, true);
            }
        },
        (error) => {
            if (generation === outcomeGeneration) {
                recordOutcome(error?.responseData, dryRun);
            }
        },
    );
    return request;
};

const theme = useTheme("ViewExecuteTransition", props);
</script>

<template>
    <div :class="theme('root')" :style="theme.hideStyle?.value" v-bind="$attrs" data-qa="view-execute-transition-root">
        <!-- The "Go Back" action teleports into the layout's PageTitle action zone. -->
        <page-actions>
            <slot label="Go Back" name="return-button" @click="handleReturnClick">
                <Button emphasis="outline" @click="handleReturnClick">Go Back</Button>
            </slot>
        </page-actions>
        <model-action-form
            :action="action"
            :action-verbose-name="transitionVerboseName"
            :app="app"
            :model="model"
            :pk="pk"
            :run-action="runAction"
            :skipped-pks="skippedPks"
            :pk-notices="pkNotices"
            :banner-description="bannerDescription"
            page
            v-bind="omit($attrs, ['class'])"
        >
            <template v-for="(_, slot) in slots" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps || {}" />
            </template>
        </model-action-form>
    </div>
</template>
