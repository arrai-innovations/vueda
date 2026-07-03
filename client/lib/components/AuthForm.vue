<script setup>
import ActionForm from "@vueda/components/ActionForm.vue";
import { storeUser } from "@vueda/stores/storeUser.js";
import "@vueda/theme/vueda-tailwind/views/AuthForm.theme.js";
import { useAuthFlow } from "@vueda/use/useAuthFlow.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { onMounted, toRef } from "vue";

/**
 * Renders a page-level authentication form with a title, subtitle, and action slot.
 * Handles reauthentication redirects and MFA pending-flow detection automatically,
 * delegating the actual form submission to an inner ActionForm.
 *
 * @vueda-slot-forward ActionForm
 */
defineOptions({});

const props = defineProps({
    /** Route path to redirect to after a successful authentication action. */
    redirect: {
        type: String,
        default: "",
    },
    /** Heading text displayed above the form. */
    header: {
        type: String,
        default: "",
    },
    /** Secondary text displayed below the heading. */
    subTitle: {
        type: String,
        default: "",
    },
    /** Async function that performs the form submission action. */
    runAction: {
        type: Function,
        default: undefined,
    },
    /** Additional props forwarded to the underlying form composable. */
    formProps: {
        type: Object,
        default: () => ({}),
    },
    /** Whether the current user is permitted to access this form. */
    permitted: {
        type: Boolean,
        default: true,
    },
    ...THEME_OVERRIDE_PROPS,
});
const { formContext, onSubmissionErrorHandler: OnSubmissionErrorHandler, redirectTo } = useAuthFlow(props);
const theme = useTheme("AuthForm", props);
const emit = defineEmits(["form-object"]);
const userStore = storeUser();

onMounted(() => {
    emit(
        "form-object",
        toRef(() => formContext.state.values),
    );
});
</script>

<template>
    <div :class="theme('root')" :style="theme.hideStyle?.value" data-qa="auth-form-root">
        <div :class="theme('outer')" data-qa="auth-form-outer">
            <div :class="theme('inner')" data-qa="auth-form-inner">
                <div :class="theme('contentContainer')" data-qa="auth-form-content-container">
                    <div :class="theme('title')" data-qa="auth-form-title">
                        <h1 :class="theme('header')">{{ header }}</h1>
                        <p v-if="subTitle" :class="theme('subTitle')">{{ subTitle }}</p>
                    </div>
                    <!-- @slot [form-content] Override the entire form content area; receives run-action, on-submission-error-handler, and redirect-to bindings. -->
                    <slot
                        name="form-content"
                        v-bind="$attrs"
                        :run-action="runAction"
                        :on-submission-error-handler="OnSubmissionErrorHandler"
                        :redirect-to="redirectTo"
                    >
                        <action-form
                            :run-action="runAction"
                            v-bind="$attrs"
                            :on-submission-error-handler="OnSubmissionErrorHandler"
                            :redirect-to="redirectTo"
                            :action-state="userStore"
                        >
                            <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                                <slot :name="slot" v-bind="slotProps || {}" />
                            </template>
                        </action-form>
                    </slot>
                </div>
            </div>
        </div>
    </div>
</template>
