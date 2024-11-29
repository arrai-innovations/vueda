<script setup>
import ActionForm from "@vueda/components/ActionForm.vue";
import FormFeedback from "@vueda/components/FormFeedback.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import { useForm } from "@vueda/use/useForm.js";
import { useWarnings } from "@vueda/use/useWarnings.js";
import { memoizedStartCase } from "@vueda/utils/crudSupport.js";
import { isArray } from "lodash-es";
import Button from "primevue/button";
import { computed, toRef } from "vue";
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
        type: [String, Number, Array],
        default: undefined,
    },
    action: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        default: undefined,
    },
    class: {
        type: [String, Array, Object],
        default: () => [],
    },
});
const actionTitleText = computed(() => {
    return props.title?.length > 0
        ? props.title
        : `${memoizedStartCase(props.action)} ${memoizedStartCase(props.model)}`;
});
const router = useRouter();
const initialValues = computed(() => {
    const initialValues = {};
    if (isArray(props.pk)) {
        props.pk.forEach((pk) => {
            initialValues[pk] = null;
        });
    } else if (props.pk) {
        initialValues[props.pk] = null;
    }
    return initialValues;
});
const formContext = useForm({
    initialValues,
});

useWarnings(toRef(props, "app"), toRef(props, "model"), formContext, toRef(props, "action"), toRef(props, "pk"));
</script>

<template>
    <div :class="props.class">
        <PageTitle :title="actionTitleText">
            <template #button>
                <slot label="Return to List" name="return-button" verb="list" @click="router.back()">
                    <Button label="Return to List" verb="list" @click="router.back()" />
                </slot>
            </template>
        </PageTitle>
        <slot name="before-list">
            <div class="max-w-full overflow-x-auto p-1 flex flex-col gap-2">
                <form-feedback type="error" />
                <form-feedback type="message" />
            </div>
        </slot>
        <action-form :action="action" :app="app" :model="model" v-bind="$attrs">
            <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps || {}" />
            </template>
        </action-form>
    </div>
</template>
