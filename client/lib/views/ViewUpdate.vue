<script setup>
import { assignReactiveObject, loadingCombine, useObject } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FormModel from "@vueda/components/FormModel.vue";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import { useForm } from "@vueda/use/useForm.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useObject404 } from "@vueda/use/useObject404.js";
import { useObjectForm } from "@vueda/use/useObjectForm.js";
import { getCRUDName, memoizedStartCase } from "@vueda/utils/crudSupport.js";
import Button from "primevue/button";
import { computed, reactive, ref, toRef, watch } from "vue";

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
        type: String,
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
    headerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    titleClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    bodyClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    loadingClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    formModelVariant: {
        type: String,
        default: "default",
    },
    // other form-model props will get passed in via $attrs, as long as there are no conflicts
});

const isActive = useIsActive();

const validAndActive = computed(
    () =>
        !!(
            isActive.value &&
            props.app &&
            props.model &&
            props.pk &&
            calculatedUpdateFields.value &&
            calculatedUpdateExpands.value
        ),
);

const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const titleStr = computed(() => {
    return `Update ${memoizedStartCase(modelConfig.info?.verbose_name)}` || "Update Item";
});
const calculatedUpdateFields = computed(() => modelConfig?.config?.updateFields);
const calculatedUpdateExpands = computed(() => modelConfig?.config?.updateExpands);

const instanceObjectProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    id: toRef(props, "pk"),
    retrieveArgs: {
        f: calculatedUpdateFields,
        e: calculatedUpdateExpands,
    },
    intendToRetrieve: validAndActive,
});
const instanceObject = useObject({
    props: instanceObjectProps,
});
const formContextProps = reactive({
    initialValues: {},
});
const formContext = useForm(formContextProps);
const objectFormProps = reactive({
    app: toRef(props, "app"),
    model: toRef(props, "model"),
    verboseName: computed(() => modelConfig.info?.verbose_name),
});
const objectForm = useObjectForm({
    props: objectFormProps,
    formContext,
    instanceObject,
});

watch(
    [validAndActive, toRef(instanceObject.state, "loading")],
    ([vAA, loading]) => {
        // populate the form when the page loads and when we have the object back.
        // undefined on loading means not run yet.
        if (vAA && loading === false) {
            assignReactiveObject(formContextProps.initialValues, instanceObject.state.object);
        }
    },
    {
        immediate: true,
    },
);
/** @type {import('vue').Ref<Error|null>} */
const myError = ref(null);
useObject404(props, instanceObject, modelConfig, myError);
const checkIfValidAndActive = () => {
    if (!validAndActive.value) {
        const newE = new Error("Invalid props for ViewUpdate.");
        newE.name = ""; // delete will just show the default Error.prototype.name
        delete newE.stack;
        if (!props.app) {
            newE.message += "\nprop 'app' is required";
        }
        if (!props.model) {
            newE.message += "\nprop 'model' is required";
        }
        if (!props.pk) {
            newE.message += "\nprop 'pk' is required";
        }
        if (!calculatedUpdateFields.value) {
            newE.message += "\nmodel config is not loaded or updateFields is falsy";
        }
        if (!calculatedUpdateExpands.value) {
            newE.message += "\nmodel config is not loaded or updateExpands is falsy";
        }
        // if not active, you'll never see this anyway.
        newE.redirectParams = {
            name: getCRUDName({
                app: props.app,
                model: props.model,
                view: "list",
            }),
        };
        newE.redirectTitle = `Return to the ${memoizedStartCase(modelConfig.info.verbose_name)} list view.`;
        delete newE.stack;
        myError.value = newE;
    }
};
let mountedOrActivatedTimeout = null;
watch(
    isActive,
    (active) => {
        if (active) {
            if (mountedOrActivatedTimeout) {
                clearTimeout(mountedOrActivatedTimeout);
            }
            mountedOrActivatedTimeout = setTimeout(checkIfValidAndActive, 2500);
        }
    },
    { immediate: true },
);
const combinedError = computed(() => {
    return myError.value || modelConfig.error || instanceObject.state.error || objectForm.state.error;
});
const combinedErrored = computed(() => !!combinedError.value);
const combinedWhileText = computed(() =>
    myError.value
        ? "validating props"
        : modelConfig.error
          ? "getting model information"
          : instanceObject.state.error
            ? "fetching object data"
            : objectForm.state.error
              ? "submitting form"
              : "",
);
const pageLoading = computed(() => loadingCombine(modelConfig.loading, instanceObject.state.loading));
const targetlessActions = computed(() =>
    (modelConfig.config.updateActions || []).filter((x) => modelConfig.config.listActions.includes(x)),
);
const detailActions = computed(() =>
    (modelConfig.config.updateActions || []).filter((x) => modelConfig.config.detailActions.includes(x)),
);
</script>
<template>
    <div>
        <page-title :loading="pageLoading" :title="titleStr">
            <template #button>
                <div class="flex gap-1 w-full justify-end">
                    <link-model-view
                        :app="app"
                        class="whitespace-nowrap grow shrink-0"
                        label="Return to List"
                        :model="model"
                        view="list"
                    />
                    <template v-for="actionName in targetlessActions" :key="actionName">
                        <slot
                            :app="app"
                            :label="memoizedStartCase(actionName)"
                            :model="model"
                            name="target-less-action-button"
                            :view="actionName"
                        >
                            <link-model-view
                                :app="app"
                                class="w-full"
                                :label="memoizedStartCase(actionName)"
                                :model="model"
                                :view="actionName"
                            />
                        </slot>
                    </template>
                </div>
            </template>
            <template #under-actions>
                <div class="flex gap-1 w-full justify-end">
                    <template v-for="actionName in detailActions" :key="actionName">
                        <slot
                            :app="app"
                            :label="memoizedStartCase(actionName)"
                            :model="model"
                            name="action-button"
                            :pk="pk"
                            :view="actionName"
                        >
                            <link-model-view
                                :app="app"
                                button
                                :label="memoizedStartCase(actionName)"
                                :model="model"
                                :pk="pk"
                                severity="secondary"
                                :view="actionName"
                            />
                        </slot>
                    </template>
                    <slot :click="objectForm.submit" :loading="objectForm.state.loading" name="submit-button">
                        <Button label="Submit" :loading="objectForm.state.loading" @click.prevent="objectForm.submit" />
                    </slot>
                </div>
            </template>
        </page-title>
        <div>
            <error-display
                :error="combinedError"
                :errored="combinedErrored"
                :ignore-form-validation-errors="true"
                :while-text="combinedWhileText"
            />
            <form @submit.prevent="objectForm.submit">
                <form-model
                    :app="app"
                    :fields="calculatedUpdateFields"
                    :model="model"
                    :variant="formModelVariant"
                    v-bind="$attrs"
                />
            </form>
        </div>
    </div>
</template>

<style scoped></style>
