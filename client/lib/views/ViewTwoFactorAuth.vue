<script setup>
import AuthorizingForm from "@vueda/components/AuthorizingForm.vue";
import LoadingSpinnerInline from "@vueda/components/LoadingSpinnerInline.vue";
import Button from "@vueda/controls/button/Button.vue";
import FormField from "@vueda/fields/FormField.vue";
import { UnauthorizedError, storeUser } from "@vueda/stores/storeUser.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useTheme } from "@vueda/use/useTheme.js";
import WidgetSelectDropdown from "@vueda/widgets/WidgetSelectDropdown.vue";
import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";
import { computed, onBeforeUnmount, reactive, ref, toRef, watch } from "vue";
import { useRouter } from "vue-router";
import { toast } from "vue-sonner";

/**
 * Two-factor authentication challenge view presented after initial login. Lets the user select an available
 * verification method (TOTP, SMS, email, or recovery code), request a code to be sent for applicable methods
 * (with a 60-second resend cooldown), and submit the code to complete authentication.
 */
defineOptions({});

const formProps = reactive({
    initialValues: {
        code: "",
    },
});
const router = useRouter();
const userStore = storeUser();
const cooldownSeconds = ref(60);
const timer = ref(null);
const clearCooldownTimer = () => {
    if (timer.value) {
        clearInterval(timer.value);
        timer.value = null;
    }
};
const startCooldown = () => {
    cooldownSeconds.value = 60;
    timer.value = setInterval(() => {
        cooldownSeconds.value--;
        if (cooldownSeconds.value <= 0) {
            clearCooldownTimer();
        }
    }, 1000);
};
const handleSendCode = async () => {
    if (timer.value) return;
    try {
        await userStore.sendTwoFactorAuthenticationCode(form.values);
        startCooldown();
        toast.success(
            `We have sent you a code via ${form.values?.method === "sms" ? "SMS" : form.values?.method === "email" ? "email" : form.values?.method}.`,
            {
                description: "Please check your device to retrieve the code.",
                duration: 15000,
            },
        );
    } catch (error) {
        toast.error("Failed to send 2FA code", {
            description: error.message,
            duration: 15000,
        });
    }
};
const handleSubmit = ({ formValues }) => {
    return userStore.twoFactorAuthenticate({
        code: formValues.code,
    });
};
const form = reactive({
    values: {},
});

const isActive = useIsActive();
const methods = ref([]);
const computedOptions = computed(() => {
    const options = methods.value.map((method) => ({
        label: method.toUpperCase(),
        value: method,
    }));

    return [...options, { label: "2FA Recovery Code", value: "recovery" }];
});
watch([isActive, toRef(userStore, "loggedIn")], async ([newActive, newloggedIn]) => {
    if (newActive && !newloggedIn) {
        try {
            const response = await userStore.getTwoFactorAuthMethod();
            methods.value = response?.methods;
        } catch (error) {
            if (error instanceof UnauthorizedError) {
                toast.warning("Please verify your account again before proceeding", {
                    duration: 10000,
                });
                await router.push({ name: "sign-in" });
                return true;
            } else {
                toast.error("Error fetching 2FA methods for the user", {
                    description: error.message,
                    duration: 10000,
                });
            }
        }
    }
});
const theme = useTheme("ViewTwoFactorAuth");
const sendCodeMethods = ["sms", "email"];
onBeforeUnmount(clearCooldownTimer);
</script>

<template>
    <authorizing-form
        :run-action="handleSubmit"
        sub-title="Select a device/method to authorize through two-factor authentication:"
        header="Two-factor authentication"
        :form-props="formProps"
        action-success-summary="Two-Factor Authentication Successful"
        action-error-summary="Two-Factor Authentication Failed"
        @form-object="form.values = $event"
    >
        <template #action-form-inner>
            <slot name="action-form-inner" :options="computedOptions" :method="form.values?.method">
                <FormField validation="text" label="Method" name="method">
                    <WidgetSelectDropdown
                        :required="true"
                        autocapitalize="none"
                        autocorrect="off"
                        :options="computedOptions"
                    />
                </FormField>
                <FormField v-if="form.values?.method" validation="text" label="Code" name="code">
                    <WidgetTextInput :required="true" />
                </FormField>
            </slot>
        </template>
        <template #action-bar="{ loading }">
            <slot
                :send-code-methods="sendCodeMethods"
                :method="form.values?.method"
                :code="form.values?.code"
                :handle-send-code="handleSendCode"
                :cooldown-seconds="cooldownSeconds"
                :timer="timer"
                :loading="loading"
            >
                <div :class="theme('buttons')" data-qa="view-two-factor-auth-buttons">
                    <Button
                        v-if="sendCodeMethods.includes(form.values?.method)"
                        variant="ghost"
                        :disabled="loading || timer"
                        @click="handleSendCode"
                    >
                        <LoadingSpinnerInline v-if="loading" />
                        {{
                            timer
                                ? `Send ${form.values?.method} again in ${cooldownSeconds}s`
                                : `Send ${form.values?.method}`
                        }}
                    </Button>
                    <Button :disabled="loading || !form.values?.code" type="submit">
                        <LoadingSpinnerInline v-if="loading" />
                        Verify
                    </Button>
                </div>
            </slot>
        </template>
    </authorizing-form>
</template>
