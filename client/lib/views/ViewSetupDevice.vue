<script setup>
import AuthForm from "@vueda/components/AuthForm.vue";
import ClickToCopyText from "@vueda/components/ClickToCopyText.vue";
import FormField from "@vueda/fields/FormField.vue";
import { storeUser } from "@vueda/stores/storeUser.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import WidgetSelectDropdown from "@vueda/widgets/WidgetSelectDropdown.vue";
import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import { useToast } from "primevue/usetoast";
import { computed, reactive, ref, toRef } from "vue";
import { useRoute, useRouter } from "vue-router";

/**
 * Multi-step form that guides the user through enrolling a two-factor authentication device.
 * Presents a method-selection step (TOTP app, email, or SMS), then a verification step where
 * the user confirms the device with a one-time code.
 */
defineOptions({});

const props = defineProps({
    /** Django app label for the model that represents the 2FA device. */
    app: {
        type: String,
        required: true,
    },
    /** Model name for the 2FA device (used to fetch available method choices). */
    model: {
        type: String,
        required: true,
    },
    /** Action name sent to the server when initiating device setup. */
    action: {
        type: String,
        default: "setup",
    },
});
const formProps = reactive({
    initialValues: {
        email: "",
    },
});
const toast = useToast();
const router = useRouter();
const userStore = storeUser();

const totpSvgDataUri = ref("");
const totpSecret = ref("");
const totpSecretDialogVisible = ref(false);
const handleSubmit = ({ formValues }) => {
    if (step.value === STEPS.CHOOSE) {
        return userStore.setupTOTPDevice({
            destination: formValues.destination,
            method: formValues.method,
        });
    } else if (step.value === STEPS.VERIFY) {
        return userStore.activateTOTPDevice({
            code: formValues.code,
        });
    }
};
const form = reactive({
    values: {},
});
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const deviceTypes = computed(() => {
    return modelConfig?.config?.fieldDetails["method"]?.choices || [];
});

const route = useRoute();
const STEPS = Object.freeze({ CHOOSE: 1, VERIFY: 2, DONE: 3 });
const step = ref(STEPS.CHOOSE);

const doAfterSuccess = async (response) => {
    if (step.value === STEPS.CHOOSE) {
        if (response) {
            totpSvgDataUri.value = response.meta?.totp_svg_data_uri;
            totpSecret.value = response.meta?.totp_secret;
        }
        if (form.values.method === "email" || form.values.method === "sms") {
            toast.add({
                severity: "success",
                summary: `Verification Code Sent`,
                detail: `We've sent you a verification ${form.values.method}. Please check your inbox, then enter your 6 digit verification code in the box below`,
            });
        }
        step.value = STEPS.VERIFY;
    } else {
        step.value = STEPS.DONE;
        const returnPath = route.query?.returnPath;
        if (returnPath && typeof returnPath === "string") {
            await router.push(returnPath);
        }
    }
};
</script>

<template>
    <auth-form
        :run-action="handleSubmit"
        sub-title="With 2FA, you have to log in with your username and password and provide another form of authentication that only you know or have access to."
        header="Set up Two-factor authentication"
        :on-submission-success-handler="doAfterSuccess"
        :form-props="formProps"
        @form-object="form.values = $event"
    >
        <template #action-form-inner>
            <!-- Replaces the entire body of the setup form; receives `options`, `totpDataUri`, `totpSecret`, `method`, and `step` as slot props. -->
            <slot
                name="action-form-inner"
                :options="deviceTypes"
                :totp-data-uri="totpSvgDataUri"
                :totp-secret="totpSecret"
                :method="form.values?.method"
                :step="step"
            >
                <FormField
                    validation="text"
                    label="Choose a device/method to set up two-factor authentication:"
                    name="method"
                >
                    <WidgetSelectDropdown
                        :required="true"
                        autocapitalize="none"
                        autocorrect="off"
                        :options="deviceTypes"
                        :disabled="step === STEPS.VERIFY"
                    />
                </FormField>
                <FormField
                    v-if="form.values?.method === 'email'"
                    validation="text"
                    label="Email"
                    name="destination"
                    help="Please enter the email address you wish to receive the email with. This address will be validated in the next step."
                >
                    <WidgetTextInput :required="true" :disabled="step === STEPS.VERIFY" />
                </FormField>
                <FormField
                    v-if="form.values?.method === 'sms'"
                    validation="text"
                    label="Phone Number"
                    name="destination"
                    help="Please enter the phone number you wish to receive the sms with. This number will be validated in the next step."
                >
                    <WidgetTextInput
                        :required="true"
                        :disabled="step === STEPS.VERIFY"
                        mask="(###) ###-####"
                        placeholder="(999) 999-9999"
                    />
                </FormField>
                <!-- Replaces the QR-code/manual-key block shown after a TOTP app method is chosen; receives `totpDataUri` and `totpSecret` as slot props. -->
                <slot name="totp-app-setup-step" :totp-data-uri="totpSvgDataUri" :totp-secret="totpSecret">
                    <div v-if="totpSvgDataUri" data-qa="view-setup-device-app">
                        <p data-qa="view-setup-device-app-info-text">
                            <strong> Scan the QR code </strong><br />
                            Use an authenticator app or browser extension to scan.
                        </p>

                        <img :src="totpSvgDataUri" alt="TOTP QR Code" data-qa="view-setup-device-app-img" />
                        Unable to scan? You can use the setup key to manually configure your authenticator app.
                        <Button label="View Key" variant="text" @click="totpSecretDialogVisible = true" />
                        <Dialog v-model:visible="totpSecretDialogVisible" modal header="Your two-factor secret">
                            <click-to-copy-text :text="totpSecret" toast="Secret Copied!" />
                        </Dialog>
                    </div>
                </slot>

                <FormField v-if="step === STEPS.VERIFY" validation="text" label="Code" name="code">
                    <WidgetTextInput :required="true" />
                </FormField>
            </slot>
        </template>
        <template #confirm-button="{ loading }">
            <!-- Replaces the primary submit button; receives `loading` as a slot prop. -->
            <slot name="confirm-button" v-bind="{ loading }">
                <Button
                    :label="step !== STEPS.CHOOSE ? 'Verify Device' : 'Choose Device'"
                    :disabled="loading || form.values?.method == null"
                    :loading="loading"
                    severity="primary"
                    type="submit"
                />
            </slot>
        </template>
        <template #cancel-button="{ loading, handleCancelClick }">
            <!-- Replaces the cancel button; receives `loading` and `handleCancelClick` as slot props. -->
            <slot name="cancel-button" v-bind="{ loading, handleCancelClick }" />
        </template>
    </auth-form>
</template>
