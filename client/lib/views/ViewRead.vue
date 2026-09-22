<script setup>
import ErrorDisplay from "@vueda/display/error-display/ErrorDisplay.vue";
import FormModel from "@vueda/form/form-model/FormModel.vue";
import LinkModelView from "@vueda/navigation/link-model-view/LinkModelView.vue";
import PageActions from "@vueda/shell/page-title/PageActions.vue";
import StickyBar from "@vueda/shell/sticky/StickyBar.vue";
import "@vueda/theme/vueda-tailwind/views/ViewRead.theme.js";
import { useDetailView } from "@vueda/use/useDetailView.js";
import { useForm } from "@vueda/use/useForm.js";
import { usePageTitle } from "@vueda/use/usePageTitle.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import { onMounted, reactive, readonly, toRef, useSlots } from "vue";

/**
 * Read-only detail view that fetches and displays a single model instance identified by its
 * primary key.
 */

defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Django app label that owns the model. */
    app: {
        type: String,
        required: true,
    },
    /** Django model name used to resolve API endpoints and configuration. */
    model: {
        type: String,
        required: true,
    },
    /** Primary key of the object instance to fetch and display. */
    pk: {
        type: String,
        required: true,
    },
    /** Action names promoted to the filled hero CTA in the action bar; defaults to the `update` action. */
    primaryActions: {
        type: Array,
        default: undefined,
    },
});

const emit = defineEmits(["object", "loading", "related-object", "calculated-object", "form-object", "form-context"]);

const slots = useSlots();

const formContextProps = reactive({ initialValues: {} });
const formContext = useForm(formContextProps);

const internalOptions = reactive({
    app: toRef(props, "app"),
    model: toRef(props, "model"),
    viewName: "read",
    pk: toRef(props, "pk"),
    primaryActions: toRef(props, "primaryActions"),
});

const { instanceObject, instance, actions } = useDetailView(internalOptions, formContextProps.initialValues);

const theme = useTheme("ViewRead", props);

// Contribute the page title and loading state to the layout's PageTitle display.
usePageTitle(() => ({ title: instance.titleStr, loading: instance.pageLoading }));

onMounted(() => {
    emit(
        "object",
        toRef(() => instanceObject.state.object),
    );
    emit(
        "loading",
        toRef(() => instanceObject.state.loading),
    );
    emit("related-object", readonly(instanceObject.state.relatedObjects || {}));
    emit("calculated-object", readonly(instanceObject.state.calculatedObjects || {}));
    emit(
        "form-object",
        toRef(() => formContext.state.values),
    );
    emit("form-context", formContext);
});
</script>
<template>
    <div :class="theme('root')" data-qa="read-form-root">
        <!-- Page-level actions teleport into the layout's PageTitle action zone. -->
        <page-actions>
            <template v-for="actionName in actions.nonDetailActions" :key="actionName">
                <slot
                    :app="app"
                    :label="memoizedStartCase(actionName)"
                    :model="model"
                    name="targetless-action-button"
                    :view="actionName"
                >
                    <link-model-view
                        :app="app"
                        :label="memoizedStartCase(actionName)"
                        :model="model"
                        :view="actionName"
                        emphasis="outline"
                    />
                </slot>
            </template>
            <!-- @slot [extra-buttons] Additional action buttons appended in the page title action area. -->
            <slot name="extra-buttons" />
        </page-actions>
        <sticky-bar zone="top" reveal="scroll-up-or-idle">
            <template #primary>
                <div class="flex flex-wrap gap-1 2xl:gap-2 w-full sm:w-fit sm:max-w-max" data-qa="read-action-buttons">
                    <template v-for="actionName in actions.detailActions" :key="actionName">
                        <!-- @slot [action-button] Override an individual action link button in the sticky bar. -->
                        <slot
                            :app="app"
                            :label="memoizedStartCase(actionName)"
                            :model="model"
                            name="action-button"
                            :pk="pk"
                            :view="actionName"
                        >
                            <link-model-view
                                :app="app"
                                button
                                :label="memoizedStartCase(actionName)"
                                :model="model"
                                :pk="pk"
                                :view="actionName"
                                emphasis="outline"
                                :primary="actions.primaryActions.has(actionName)"
                            />
                        </slot>
                    </template>
                    <template v-for="transition in actions.availableTransitions" :key="transition">
                        <!-- @slot [transition-button] Override an individual workflow transition button in the sticky bar. -->
                        <slot
                            :app="app"
                            :label="memoizedStartCase(transition)"
                            :model="model"
                            name="transition-button"
                            :pk="pk"
                            :view="transition"
                        >
                            <link-model-view
                                :app="app"
                                button
                                :label="memoizedStartCase(transition)"
                                :model="model"
                                :pk="pk"
                                :view="transition"
                                emphasis="outline"
                            />
                        </slot>
                    </template>
                </div>
            </template>
        </sticky-bar>
        <div v-bind="$attrs" :class="theme('body')" data-qa="read-form">
            <error-display
                :error="instance.combinedError"
                :errored="instance.combinedErrored"
                :ignore-form-validation-errors="true"
                :while-text="instance.combinedWhileText"
            />
            <form-model
                :app="app"
                :model="model"
                view="read"
                :widget-props="instance.computedWidgetProps"
                v-bind="instance.combinedFormProps"
            >
                <template v-for="(_, slot) in slots" #[slot]="slotProps">
                    <slot :name="slot" v-bind="slotProps || {}" />
                </template>
            </form-model>
        </div>
    </div>
</template>

<style scoped></style>
