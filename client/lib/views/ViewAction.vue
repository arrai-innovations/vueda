<script setup>
import ModelActionForm from "@vueda/components/ModelActionForm.vue";
import PageActions from "@vueda/components/PageActions.vue";
import Button from "@vueda/controls/button/Button.vue";
import "@vueda/theme/vueda-tailwind/views/ViewAction.theme.js";
import { useForm } from "@vueda/use/useForm.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { usePageTitle } from "@vueda/use/usePageTitle.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import omit from "lodash-es/omit.js";
import { computed, inject, useSlots } from "vue";
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
// Contribute the page title to the layout's PageTitle display.
usePageTitle(() => ({ title: actionTitleText.value }));
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

const handleReturnClick = () => {
    router.back();
};
const theme = useTheme("ViewAction", props);
</script>

<template>
    <div :class="theme('root')" :style="theme.hideStyle?.value" v-bind="$attrs" data-qa="view-action-root">
        <!-- Page actions teleport into the layout's PageTitle action zone. -->
        <page-actions>
            <slot label="Go Back" name="return-button" verb="return" @click="handleReturnClick">
                <Button @click="handleReturnClick">Go Back</Button>
            </slot>
        </page-actions>
        <slot :action="action" :app="app" :form-context="formContext" :model="model" :pk="pk">
            <model-action-form :action="action" :app="app" :model="model" v-bind="omit($attrs, ['class'])">
                <template v-for="(_, slot) in omit(slots, ['before-list'])" #[slot]="slotProps">
                    <slot :name="slot" v-bind="slotProps || {}" />
                </template>
            </model-action-form>
        </slot>
    </div>
</template>
