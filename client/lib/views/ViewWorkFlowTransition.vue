<script setup>
import LinkModelView from "@vueda/components/LinkModelView.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import { storeWorkflow } from "@vueda/stores/storeWorkflow.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { memoizedStartCase } from "@vueda/utils/crudSupport.js";
import { computedAsync } from "@vueuse/core";
import isArray from "lodash-es/isArray.js";
import isEmpty from "lodash-es/isEmpty.js";
import Button from "primevue/button";
import RadioButton from "primevue/radiobutton";
import { useToast } from "primevue/usetoast";
import { computed, ref, toRef, watch } from "vue";
import { useRouter } from "vue-router";

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
    class: {
        type: [String, Array, Object],
        default: () => [],
    },
});
const workflow = storeWorkflow();
const toast = useToast();
const router = useRouter();
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const titleStr = computed(() => {
    return `Transitions for ${memoizedStartCase(modelConfig.info?.verbose_name)}`;
});
const selectedAction = ref(null);

const modelWorkFlowTransitions = computedAsync(
    async () => {
        try {
            await workflow.fetchWorkflowTransition(props.app, props.model);
            return workflow.workflowTransitions[props.app][props.model].transitions;
        } catch (WorkflowError) {
            return "no workflow available";
        }
    },
    null, // initial state
);

const availableTransitions = computed(() => {
    if (isArray(props.pk)) {
        let commonTransitions = [];
        props.pk.forEach((id, index) => {
            const pkTransitions = workflow.objectTransitions.find((t) => t.id === id)?.transitions || [];
            if (index === 0) {
                commonTransitions = pkTransitions;
            } else {
                commonTransitions = commonTransitions.filter((t) => {
                    return pkTransitions.some((pt) => {
                        return pt.code === t.code;
                    });
                });
            }
        });
        return commonTransitions;
    } else {
        const pkTransitions =
            workflow.objectTransitions.find((t) => t.id === props.pk)?.transitions.map((t) => t.code) || [];
        return pkTransitions;
    }
});

watch(
    () => props.pk,
    async (pk) => {
        if (isEmpty(pk)) {
            return;
        }
        if (isArray(pk)) {
            for (const id of pk) {
                await workflow.fetchObjectTransitions(props.app, props.model, id);
            }
            return;
        }
        await workflow.fetchObjectTransitions(props.app, props.model, pk);
    },
    { immediate: true },
);

const handleSubmit = async (actionCode) => {
    try {
        debugger;
        //TODO: server side should support bulk execute transitions
        if (props.pk && !Array.isArray(props.pk)) {
            await workflow.executeTransition(props.app, props.model, props.pk, actionCode, router);
        }
        toast.add({ severity: "success", summary: "transition succeed" });
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
            available workflow transitions for {{ modelConfig.info?.verbose_name }} are {{ modelWorkFlowTransitions }}
            <div v-if="availableTransitions.length">
                <p>the available transitions for the select objects are</p>
                <form @submit.prevent="handleSubmit">
                    <div v-for="transition in availableTransitions" :key="transition.code">
                        <RadioButton
                            v-model="selectedAction"
                            :input-id="transition.code"
                            name="dynamic"
                            :value="transition.name"
                        />
                        <label class="ml-2" :for="transition.code">{{ transition.name }}</label>
                    </div>
                    <Button :disabled="!selectedAction" label="execute transition" type="submit" />
                </form>
            </div>
            <div v-else>
                <p>no transition available for selected {{ modelConfig.info?.verbose_name }}</p>
            </div>
        </div>
    </div>
</template>
