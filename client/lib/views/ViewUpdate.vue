<script setup>
import { assignReactiveObject, useObject } from "@arrai-innovations/reactive-helpers";
import FormModel from "@vueda/components/FormModel.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import { useForm } from "@vueda/use/useForm.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useObjectForm } from "@vueda/use/useObjectForm.js";
import Button from "primevue/button";
import { computed, reactive, toRef, watch } from "vue";

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
const validAndActive = computed(() => !!(isActive.value && props.app && props.model && props.pk));

const calculatedUpdateFields = computed(() => modelConfig.config.updateFields || []);

const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const instanceObjectProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    id: toRef(props, "pk"),
    retrieveArgs: {
        f: calculatedUpdateFields,
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

const titleStr = computed(() => {
    return `Update ${modelConfig.info?.verbose_name}` || "Update Item";
});
const combinedClasses = useCombinedClasses("ViewUpdate", props);
</script>

<template>
    <div :class="combinedClasses.outerClass">
        <page-title :title="titleStr">
            <template #button>
                <Button
                    class="w-full"
                    label="Submit"
                    :loading="objectForm.running"
                    @click.prevent="objectForm.submit"
                />
            </template>
        </page-title>
        <div :class="combinedClasses.bodyClass">
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
