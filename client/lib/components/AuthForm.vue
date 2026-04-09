<script setup>
import ActionForm from "@vueda/components/ActionForm.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import { UnauthorizedError, storeUser } from "@vueda/stores/storeUser.js";
import { useForm } from "@vueda/use/useForm.js";
import { defaultOnSubmissionError } from "@vueda/use/useObjectForm.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { onMounted, toRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";

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
const router = useRouter();
const formContext = useForm(props.formProps);
const theme = useTheme("AuthForm", props);
const emit = defineEmits(["form-object"]);
const route = useRoute();

onMounted(() => {
    emit(
        "form-object",
        toRef(() => formContext.state.values),
    );
});
const doReauthenticate = async () => {
    toast.warning("Please verify your account again before proceeding", {
        duration: 10000,
    });
    await router.push({ name: "reauthenticate", query: { redirect: route.fullPath } });
};
const userStore = storeUser();
watch(toRef(userStore, "pendingFlow"), async (newPendingFlow) => {
    if (newPendingFlow) {
        if (newPendingFlow.id === "mfa_reauthenticate" || newPendingFlow.id === "reauthenticate") {
            await doReauthenticate();
        }
    }
});

const OnSubmissionErrorHandler = async ({ error, formContext, toast }) => {
    if (error instanceof UnauthorizedError) {
        await doReauthenticate();
        return true;
    }
    return await defaultOnSubmissionError({ error, formContext, toast });
};
const redirectTo = async () => {
    const returnPath = route.query?.returnPath;
    if (returnPath) {
        await router.push(returnPath);
    }
};
</script>

<template>
    <div :class="theme('root')" data-qa="auth-form-root">
        <PageTitle :title="header">
            <template #subtitle>
                {{ subTitle }}
            </template>
        </PageTitle>
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
</template>
