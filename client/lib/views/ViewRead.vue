<script setup>
import { useObject } from "@arrai-innovations/reactive-helpers";
import LoadingSpinner from "@vueda/components/LoadingSpinner.vue";
import useCombinedClasses from "@vueda/use/useCombinedClasses.js";
import useIsActive from "@vueda/use/useIsActive.js";
import useModelConfig from "@vueda/use/useModelConfig.js";
import get from "lodash-es/get.js";
import isEmpty from "lodash-es/isEmpty";
import { computed, reactive, toRef } from "vue";

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
        default: undefined,
    },
    variant: {
        type: String,
        default: "default",
    },
});

const isActive = useIsActive();
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const calculatedReadFields = computed(() => {
    // if they don't pass readFields, use the modelConfig fields.
    //  modelConfig fields already falls back to models fields supplied by the server
    return props.readFields || modelConfig.config.fields.map((f) => f.name);
});
const instanceObjectProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    id: toRef(props, "pk"),
    retrieveArgs: {
        f: calculatedReadFields,
    },
    intendToRetrieve: computed(() => !!(isActive.value && props.app && props.model && props.pk)),
});
const instanceObject = useObject({
    props: instanceObjectProps,
});

const combinedClasses = useCombinedClasses("@vueda/views/ViewRead.vue", props);
</script>

<template>
    <div :class="combinedClasses.outerClass">
        <div :class="combinedClasses.headerClass">
            <h1 :class="combinedClasses.titleClass">
                {{ `Read ${modelConfig.info?.verbose_name}` || "Read Item" }}
                <loading-spinner
                    v-if="modelConfig.loading || isEmpty(modelConfig.config) || isEmpty(modelConfig.info)"
                    :class="combinedClasses.loadingClass"
                />
            </h1>
        </div>
        <div :class="combinedClasses.bodyClass">
            <template v-for="field in readFields">
                <!-- todo: read-only field widgets? vs form field widgets -->
                {{ get(instanceObject.state.object, field.name) }}
            </template>
        </div>
    </div>
</template>
