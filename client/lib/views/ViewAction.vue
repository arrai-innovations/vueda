<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import ActionForm from "@vueda/components/ActionForm.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import { useForm } from "@vueda/use/useForm.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { useWarnings } from "@vueda/use/useWarnings.js";
import { memoizedStartCase } from "@vueda/utils/crudSupport.js";
import { isArray } from "lodash-es";
import omit from "lodash-es/omit.js";
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
    ...THEME_OVERRIDE_PROPS,
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
const handleReturnClick = () => {
    router.back();
};
const theme = useTheme("ViewAction", props);
const rootClass = computed(() => combineClasses(theme.root, props.class));
</script>

<template>
    <div :class="rootClass" data-qa="view-action-root">
        <PageTitle :title="actionTitleText">
            <template #button>
                <slot label="Go Back" name="return-button" verb="return" @click="handleReturnClick">
                    <Button label="Go Back" verb="return" @click="handleReturnClick" />
                </slot>
            </template>
            <template v-for="(_, slot) in omit($slots, ['before-list', 'default'])" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps || {}" />
            </template>
        </PageTitle>
        <slot :action="action" :app="app" :form-context="formContext" :model="model" :pk="pk">
            <action-form :action="action" :app="app" :model="model" v-bind="$attrs">
                <template v-for="(_, slot) in omit($slots, ['before-list'])" #[slot]="slotProps">
                    <slot :name="slot" v-bind="slotProps || {}" />
                </template>
            </action-form>
        </slot>
    </div>
</template>
