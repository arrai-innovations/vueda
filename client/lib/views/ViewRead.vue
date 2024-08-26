<script setup>
import { useObject } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useObject404 } from "@vueda/use/useObject404.js";
import { LIST_VIEW_CRUD_NAME, memoizedStartCase } from "@vueda/utils/crudSupport.js";
import get from "lodash-es/get.js";
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
        type: [String, Number],
        required: true,
    },
    readFields: {
        type: Array,
        default: () => [],
    },
    variant: {
        type: String,
        default: "default",
    },
});

const isActive = useIsActive();

const validAndActive = computed(() => !!(isActive.value && props.app && props.model && props.pk));

const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const titleStr = computed(() => {
    return `Read ${memoizedStartCase(modelConfig.info?.verbose_name)}` || "Read Item";
});
const calculatedReadFields = computed(() => {
    // if they don't pass readFields, use the modelConfig fields.
    //  modelConfig fields already falls back to models fields supplied by the server
    if (props.readFields.length) {
        return props.readFields;
    } else if (modelConfig.config.readFields?.length) {
        return modelConfig.config.readFields;
    }
    return [];
});
const instanceObjectProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    id: toRef(props, "pk"),
    pkKey: computed(() => modelConfig.info?.pk ?? "id"),
    retrieveArgs: {
        f: calculatedReadFields,
    },
    intendToRetrieve: validAndActive,
});
const instanceObject = useObject({
    props: instanceObjectProps,
});
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
        // if not active, you'll never see this anyway.
        newE.redirectParams = {
            name: LIST_VIEW_CRUD_NAME,
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
    return myError.value || modelConfig.error || instanceObject.state.error;
});
const combinedErrored = computed(() => !!combinedError.value);
const combinedWhileText = computed(() =>
    myError.value
        ? "validating props"
        : modelConfig.error
          ? "getting model information"
          : instanceObject.state.error
            ? "fetching object data"
            : "",
);
</script>

<template>
    <div>
        <page-title :loading="instanceObject.state.loading" :title="titleStr" />
        <div>
            <error-display :error="combinedError" :errored="combinedErrored" :while-text="combinedWhileText" />
            <template v-for="field in calculatedReadFields" :key="field">
                <!-- todo: read-only field widgets? vs form field widgets -->
                {{ field }}:
                {{ get(instanceObject.state.object, field) }}
                <br />
            </template>
        </div>
    </div>
</template>
