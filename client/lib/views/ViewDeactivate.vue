<script setup>
import "@vueda/theme/vueda-tailwind/views/ViewDeactivate.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import ViewSelectedObjectsAction from "@vueda/views/ViewSelectedObjectsAction.vue";
import omit from "lodash-es/omit.js";
import { computed, useSlots } from "vue";

/**
 * View that renders a confirmation form for the deactivate action via ModelActionForm, then sends
 * a PATCH request to the deactivate endpoint when the user confirms. It shares its body with
 * ViewActivate: the selected objects, the page title, the "Go Back" action, warning confirmation,
 * and bulk requests. Attributes and slots pass through to ModelActionForm, so a wrapping page can
 * adapt it, for example to a self-service account page with `confirmText`, `actionVerboseName`,
 * and the `confirm-message` slot.
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
    /** Django model name whose instances will be deactivated. */
    model: {
        type: String,
        required: true,
    },
    /** Primary key or array of primary keys identifying the instances to deactivate. */
    pk: {
        type: [String, Array],
        required: true,
    },
    /** Page title override; defaults to "Deactivate {Model}". */
    title: {
        type: String,
        default: undefined,
    },
    ...THEME_OVERRIDE_PROPS,
});

const slots = useSlots();
const titleText = computed(() => {
    return props.title?.length > 0 ? props.title : `Deactivate ${memoizedStartCase(props.model)}`;
});
const theme = useTheme("ViewDeactivate", props);
</script>

<template>
    <div :class="theme('root')" :style="theme.hideStyle?.value" v-bind="$attrs" data-qa="view-deactivate-root">
        <view-selected-objects-action
            :app="app"
            :model="model"
            :pk="pk"
            action="deactivate"
            :title="titleText"
            tone="warning"
            v-bind="omit($attrs, ['class'])"
        >
            <template v-for="(_, slot) in slots" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps || {}" />
            </template>
        </view-selected-objects-action>
    </div>
</template>
