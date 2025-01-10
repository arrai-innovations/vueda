<script setup>
import DetailedView from "@vueda/components/DetailedView.vue";
import { useForm } from "@vueda/use/useForm.js";
import { reactive } from "vue";

defineOptions({
    inheritAttrs: false,
});

defineProps({
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
});
const viewName = "read";

const emit = defineEmits(["object", "loading", "related-object", "calculated-object", "form-object", "form-context"]);

const formContextProps = reactive({
    initialValues: {},
});
useForm(formContextProps);
</script>

<template>
    <detailed-view
        v-model="formContextProps.initialValues"
        :app="app"
        :model="model"
        :pk="pk"
        :view-name="viewName"
        v-bind="$attrs"
        @form-context="emit('form-context', $event)"
        @form-object="emit('form-object', $event)"
        @loading="emit('loading', $event)"
        @object="emit('object', $event)"
    >
        <template v-for="(_, slot) in $slots" #[slot]="slotProps">
            <slot :name="slot" v-bind="slotProps || {}" />
        </template>
    </detailed-view>
</template>
