<script setup>
import LinkModelView from "@vueda/components/LinkModelView.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import { ControlButton } from "@vueda/controls/button";
import { storeWorkflow } from "@vueda/stores/storeWorkflow.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { getAppModelDotName, memoizedStartCase } from "@vueda/utils/case.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import { computedAsync } from "@vueuse/core";
import isEmpty from "lodash-es/isEmpty.js";
import RadioButton from "primevue/radiobutton";
import { useToast } from "primevue/usetoast";
import { computed, inject, ref, toRef, watch } from "vue";
import { useRouter } from "vue-router";

/**
 * View that lists the available workflow transitions for one or more model instances and allows
 * the user to select and execute a transition.
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
const toast = useToast();
const router = useRouter();
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));

if (!inject(LookupContextSymbol, null)) {
    useLookupContext();
}

const appModelKey = computed(() => getAppModelDotName({ app: props.app, model: props.model }));
const titleStr = computed(() => {
    return `Transitions for ${memoizedStartCase(modelConfig.info?.verbose_name)}`;
});
const selectedAction = ref(null);

const modelWorkflowTransitions = computedAsync(async () => {
    try {
        await workflow.fetchWorkflowTransition(props.app, props.model);
        return workflow.workflowTransitions[appModelKey.value] || [];
    } catch (error) {
        return [];
    }
}, []);

const transitionsForPk = (pk) => {
    const entry = workflow.objectTransitions?.[appModelKey.value]?.[pk];
    return entry?.transitions || [];
};

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
        await workflow.fetchObjectTransitions(app, model, pk);
    },
    { immediate: true },
);

const handleSubmit = async () => {
    try {
        if (!selectedAction.value || typeof selectedAction.value !== "string") {
            throw new Error("ViewWorkflowTransition: selected transition code is missing or invalid.");
        }
        if (props.pk) {
            await workflow.executeTransition(props.app, props.model, props.pk, selectedAction.value, router);
        }
        toast.add({ severity: "success", summary: "transition succeeded" });
        router.back();
    } catch (error) {
        toast.add({ severity: "error", summary: "transition failed" });
    }
};
</script>

<template>
    <div :class="props.class">
        <page-title :loading="workflow.loading" :title="titleStr">
            <template #button>
                <div class="flex gap-1 w-full justify-end">
                    <link-model-view
                        :app="app"
                        class="whitespace-nowrap grow shrink-0"
                        label="Return to List"
                        :model="model"
                        view="list"
                    />
                </div>
            </template>
        </page-title>
        <div>
            available workflow transitions for {{ modelConfig.info?.verbose_name }} are {{ modelWorkflowTransitions }}
            <div v-if="availableTransitions.length">
                <p>the available transitions for the select objects are</p>
                <form @submit.prevent="handleSubmit">
                    <div v-for="transition in availableTransitions" :key="transition.code">
                        <RadioButton
                            v-model="selectedAction"
                            :input-id="transition.code"
                            name="dynamic"
                            :value="transition.code"
                        />
                        <label class="ml-2" :for="transition.code">{{ transition.name }}</label>
                    </div>
                    <ControlButton :disabled="!selectedAction" type="submit">execute transition</ControlButton>
                </form>
            </div>
            <div v-else>
                <p>no transition available for selected {{ modelConfig.info?.verbose_name }}</p>
            </div>
        </div>
    </div>
</template>
