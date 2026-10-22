<script setup>
import "@vueda/theme/vueda-tailwind/views/ViewActivate.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import ViewSelectedObjectsAction from "@vueda/views/ViewSelectedObjectsAction.vue";
import omit from "lodash-es/omit.js";
import { useSlots } from "vue";

/**
 * View that renders a confirmation form for the activate action via ModelActionForm, then sends
 * a PATCH request to the activate endpoint when the user confirms. Contributes its title to the
 * layout's PageTitle display via usePageTitle and teleports its "Go Back" action into the title
 * action zone via PageActions, matching sibling action-router views (ViewAction,
 * ViewExecuteTransition, ViewHistoryList).
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
    /** Django model name whose instances will be activated. */
    model: {
        type: String,
        required: true,
    },
    /** Primary key or array of primary keys identifying the instances to activate. */
    pk: {
        type: [String, Array],
        required: true,
    },
    /**
     * Page title override. The default title is "Activate" followed by the model's verbose name. When `pk` lists more
     * than one object, the default uses the verbose plural name. The default is empty until the verbose name is known,
     * so the layout shows a skeleton.
     */
    title: {
        type: String,
        default: undefined,
    },
    ...THEME_OVERRIDE_PROPS,
});

const slots = useSlots();
const theme = useTheme("ViewActivate", props);
</script>

<template>
    <div :class="theme('root')" :style="theme.hideStyle?.value" v-bind="$attrs" data-qa="view-activate-root">
        <view-selected-objects-action
            :app="app"
            :model="model"
            :pk="pk"
            action="activate"
            :title="title"
            tone="success"
            v-bind="omit($attrs, ['class'])"
        >
            <template v-for="(_, slot) in slots" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps || {}" />
            </template>
        </view-selected-objects-action>
    </div>
</template>
