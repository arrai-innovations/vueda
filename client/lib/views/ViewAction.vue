<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import ModelActionForm from "@vueda/components/ModelActionForm.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import { useForm } from "@vueda/use/useForm.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { useWarnings } from "@vueda/use/useWarnings.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import omit from "lodash-es/omit.js";
import Button from "primevue/button";
import { computed, inject, toRef, useSlots } from "vue";
import { useRouter } from "vue-router";

/**
 * Full-page view for executing a model action. Renders a page title with a "Go Back" button and embeds a
 * ModelActionForm for the specified app, model, and action. Accepts an optional primary key and initial form
 * values to pre-populate the form.
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
    /** Django model name the action belongs to. */
    model: {
        type: String,
        required: true,
    },
    /** Primary key(s) of the object(s) to act on; pass an array for multi-object actions. */
    pk: {
        type: [String, Number, Array],
        default: undefined,
    },
    /** Name of the action to execute. */
    action: {
        type: String,
        required: true,
    },
    /** Page title override; defaults to a formatted combination of the action and model names. */
    title: {
        type: String,
        default: undefined,
    },
    /** Additional CSS classes applied to the root element. */
    class: {
        type: [String, Array, Object],
        default: () => [],
    },
    /** Initial field values pre-populated into the action form. */
    initialFormValues: {
        type: Object,
        default: undefined,
    },
    ...THEME_OVERRIDE_PROPS,
});
if (!inject(LookupContextSymbol, null)) {
    useLookupContext();
}
const slots = useSlots();
const actionTitleText = computed(() => {
    return props.title?.length > 0
        ? props.title
        : `${memoizedStartCase(props.action)} ${memoizedStartCase(props.model)}`;
});
const router = useRouter();
const initialValues = computed(() => {
    if (props.initialFormValues) {
        return props.initialFormValues;
    }
    const initialValues = {};
    if (Array.isArray(props.pk)) {
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
            <template v-for="(_, slot) in omit(slots, ['before-list', 'default'])" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps || {}" />
            </template>
        </PageTitle>
        <slot :action="action" :app="app" :form-context="formContext" :model="model" :pk="pk">
            <model-action-form :action="action" :app="app" :model="model" v-bind="$attrs">
                <template v-for="(_, slot) in omit(slots, ['before-list'])" #[slot]="slotProps">
                    <slot :name="slot" v-bind="slotProps || {}" />
                </template>
            </model-action-form>
        </slot>
    </div>
</template>
