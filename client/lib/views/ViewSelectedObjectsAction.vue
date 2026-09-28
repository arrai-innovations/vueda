<script setup>
import { useList } from "@arrai-innovations/reactive-helpers";
import Button from "@vueda/controls/button/Button.vue";
import LoadingSpinnerBlock from "@vueda/display/loading/LoadingSpinnerBlock.vue";
import PageActions from "@vueda/shell/page-title/PageActions.vue";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { usePageTitle } from "@vueda/use/usePageTitle.js";
import { allPagePaginatedListCrudAdaptor } from "@vueda/utils/listCrud.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import ModelActionForm from "@vueda/views/ModelActionForm.vue";
import isEmpty from "lodash-es/isEmpty.js";
import { computed, inject, reactive, toRef, useSlots } from "vue";
import { useRouter } from "vue-router";

/**
 * Shared body of ViewActivate and ViewDeactivate: loads the selected objects,
 * contributes the page title, teleports a "Go Back" action into the title action zone, and runs
 * the action through ModelActionForm with a PATCH request. Every attribute, such as `tone` or
 * `confirmText`, and every slot passes through to ModelActionForm. The wrapping view owns the
 * root element, its theme key, and the action's defaults.
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
    /** Django model name whose instances the action targets. */
    model: {
        type: String,
        required: true,
    },
    /** Primary key or array of primary keys identifying the instances to act on. */
    pk: {
        type: [String, Array],
        required: true,
    },
    /** Action name sent to the server, such as `"activate"`. */
    action: {
        type: String,
        required: true,
    },
    /** Page title contributed to the layout's PageTitle display. */
    title: {
        type: String,
        required: true,
    },
});

const slots = useSlots();
const isActive = useIsActive();
const validAndActive = computed(
    () => !!(isActive.value && props.app && props.model && props.pk && modelConfig.loading === false),
);
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));

if (!inject(LookupContextSymbol, null)) {
    useLookupContext();
}

const instanceListProps = reactive({
    target: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    pkKey: computed(() => modelConfig.info?.pk ?? "id"),
    params: {
        id: computed(() => (Array.isArray(props.pk) ? props.pk : [props.pk])),
    },
    intendToList: validAndActive,
});

const instanceList = useList({
    props: instanceListProps,
    handlers: {
        list: allPagePaginatedListCrudAdaptor,
    },
    keepOldPages: false,
    clearListOnListIntentTriggered: false,
});

// Contribute the page title to the layout's PageTitle display.
usePageTitle(() => ({ title: props.title }));

const router = useRouter();
const handleReturnClick = () => {
    router.back();
};
</script>

<template>
    <!-- The "Go Back" action teleports into the layout's PageTitle action zone. -->
    <page-actions>
        <slot label="Go Back" name="return-button" @click="handleReturnClick">
            <Button @click="handleReturnClick">Go Back</Button>
        </slot>
    </page-actions>
    <div v-if="!isEmpty(modelConfig.info)">
        <model-action-form
            :action="action"
            :app="app"
            :model="model"
            :objects="instanceList.state.objects"
            :pk="pk"
            :fetch-state="instanceList.state"
            :instance-list="instanceList"
            request-method="PATCH"
            v-bind="$attrs"
        >
            <template v-for="(_, slot) in slots" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps || {}" />
            </template>
        </model-action-form>
    </div>
    <div v-else><loading-spinner-block /></div>
</template>
