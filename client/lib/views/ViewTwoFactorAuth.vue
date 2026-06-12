<script setup>
import AuthorizingForm from "@vueda/components/AuthorizingForm.vue";
import LoadingSpinnerInline from "@vueda/components/LoadingSpinnerInline.vue";
import Button from "@vueda/controls/button/Button.vue";
import InputOTP from "@vueda/controls/input-otp/InputOTP.vue";
import InputOTPGroup from "@vueda/controls/input-otp/InputOTPGroup.vue";
import InputOTPSlot from "@vueda/controls/input-otp/InputOTPSlot.vue";
import FormField from "@vueda/fields/FormField.vue";
import { UnauthorizedError, storeUser } from "@vueda/stores/storeUser.js";
import "@vueda/theme/vueda-tailwind/views/ViewTwoFactorAuth.theme.js";
import { useIcons } from "@vueda/use/useIcons.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import WidgetSelectDropdown from "@vueda/widgets/WidgetSelectDropdown.vue";
import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";
import { computed, onBeforeUnmount, reactive, ref, toRef, watch } from "vue";
import { useRouter } from "vue-router";
import { toast } from "vue-sonner";

/**
 * Two-factor authentication challenge view presented after initial login. Lets the user select an available
 * verification method (TOTP, SMS, email), request a code to be sent for applicable methods (with a 60-second
 * resend cooldown), and submit the code to complete authentication. A separate ghost CTA reveals a
 * recovery-code path that swaps the form body to a single mono text input.
 */
defineOptions({});

const props = defineProps({ ...THEME_OVERRIDE_PROPS });

const formProps = reactive({
    initialValues: {
        code: "",
    },
});
const router = useRouter();
const userStore = storeUser();
const cooldownSeconds = ref(60);
const timer = ref(null);
const useRecoveryCode = ref(false);
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
    return methods.value.map((method) => ({
        label: method.toUpperCase(),
        value: method,
    }));
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
const theme = useTheme("ViewTwoFactorAuth", props);
const icon = useIcons("ViewTwoFactorAuth");
const sendCodeMethods = ["sms", "email"];
const toggleRecovery = () => {
    useRecoveryCode.value = !useRecoveryCode.value;
    if (useRecoveryCode.value) {
        form.values.method = "recovery";
    } else {
        form.values.method = undefined;
    }
};
onBeforeUnmount(clearCooldownTimer);
</script>

<template>
    <!-- TODO: theme.hideStyle requires a single themed root; root is a delegated <authorizing-form> child that owns its own hideStyle, this component only themes inner slots. -->
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
            <slot
                name="action-form-inner"
                :options="computedOptions"
                :method="form.values?.method"
                :use-recovery-code="useRecoveryCode"
            >
                <template v-if="useRecoveryCode">
                    <FormField validation="text" label="Recovery code" name="code">
                        <WidgetTextInput
                            :required="true"
                            autocapitalize="none"
                            autocorrect="off"
                            :class="theme('recoveryInput')"
                            data-qa="view-two-factor-auth-recovery-input"
                        />
                    </FormField>
                </template>
                <template v-else>
                    <FormField validation="text" label="Method" name="method">
                        <WidgetSelectDropdown
                            :required="true"
                            autocapitalize="none"
                            autocorrect="off"
                            :options="computedOptions"
                        />
                    </FormField>
                    <FormField v-if="form.values?.method" validation="text" label="Code" name="code">
                        <InputOTP :maxlength="6" data-qa="view-two-factor-auth-otp">
                            <InputOTPGroup>
                                <InputOTPSlot v-for="i in 6" :key="i" :index="i - 1" />
                            </InputOTPGroup>
                        </InputOTP>
                    </FormField>
                </template>
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
                :use-recovery-code="useRecoveryCode"
                :toggle-recovery="toggleRecovery"
            >
                <div :class="theme('buttons')" data-qa="view-two-factor-auth-buttons">
                    <Button
                        v-if="!useRecoveryCode && sendCodeMethods.includes(form.values?.method)"
                        variant="ghost"
                        :disabled="loading || timer"
                        :data-state="timer ? 'cooldown' : undefined"
                        data-qa="view-two-factor-auth-resend"
                        @click="handleSendCode"
                    >
                        <LoadingSpinnerInline v-if="loading" />
                        <component
                            :is="icon('clock').component"
                            v-if="timer && icon('clock')"
                            v-bind="icon('clock').props"
                            aria-hidden="true"
                        />
                        Send {{ form.values?.method }}
                        <span
                            v-if="timer"
                            :class="theme('cooldownChip')"
                            data-qa="view-two-factor-auth-cooldown-chip"
                            aria-live="polite"
                        >
                            {{ cooldownSeconds }}s
                        </span>
                    </Button>
                    <Button :disabled="loading || !form.values?.code" type="submit">
                        <LoadingSpinnerInline v-if="loading" />
                        Verify
                    </Button>
                    <Button
                        variant="ghost"
                        type="button"
                        :class="theme('recoveryToggle')"
                        data-qa="view-two-factor-auth-recovery-toggle"
                        @click="toggleRecovery"
                    >
                        <component
                            :is="icon('lifeRing').component"
                            v-if="icon('lifeRing')"
                            v-bind="icon('lifeRing').props"
                            aria-hidden="true"
                        />
                        {{ useRecoveryCode ? "Back to verified methods" : "Use a recovery code" }}
                    </Button>
                </div>
            </slot>
        </template>
    </authorizing-form>
</template>
