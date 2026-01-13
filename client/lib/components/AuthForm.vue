<script setup>
import ActionForm from "@vueda/components/ActionForm.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import { UnauthorizedError, storeUser } from "@vueda/stores/storeUser.js";
import { useForm } from "@vueda/use/useForm.js";
import { defaultOnSubmissionError } from "@vueda/use/useObjectForm.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { useToast } from "primevue/usetoast";
import { onMounted, toRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const props = defineProps({
    redirect: {
        type: String,
        default: "",
    },
    header: {
        type: String,
        default: "",
    },
    subTitle: {
        type: String,
        default: "",
    },
    runAction: {
        type: Function,
        default: undefined,
    },
    formProps: {
        type: Object,
        default: () => ({}),
    },
    permitted: {
        type: Boolean,
        default: true,
    },
    ...THEME_OVERRIDE_PROPS,
});
const toast = useToast();
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
    toast.add({
        severity: "warn",
        summary: "Please verify your account again before proceeding",
        life: 10000,
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
