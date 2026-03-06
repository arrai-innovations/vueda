<script setup>
import AuthorizingForm from "@vueda/components/AuthorizingForm.vue";
import FieldString from "@vueda/fields/FieldString.vue";
import { UnauthorizedError, storeUser } from "@vueda/stores/storeUser.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useTheme } from "@vueda/use/useTheme.js";
import WidgetInput from "@vueda/widgets/WidgetInput.vue";
import { getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import WidgetSelect from "@vueda/widgets/WidgetSelect.vue";
import Button from "primevue/button";
import { useToast } from "primevue/usetoast";
import { computed, onBeforeUnmount, reactive, ref, toRef, useSlots, watch } from "vue";
import { useRouter } from "vue-router";

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
const toast = useToast();
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
        toast.add({
            severity: "success",
            summary: `We have sent you a code via ${form.values?.method === "sms" ? "SMS" : form.values?.method === "email" ? "email" : form.values?.method}.`,
            detail: "Please check your device to retrieve the code.",
            life: 15000,
        });
    } catch (error) {
        toast.add({
            severity: "error",
            summary: "Failed to send 2FA code",
            detail: error.message,
            life: 15000,
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
                toast.add({
                    severity: "warn",
                    summary: "Please verify your account again before proceeding",
                    life: 10000,
                });
                await router.push({ name: "sign-in" });
                return true;
            } else {
                toast.add({
                    severity: "error",
                    summary: "Error fetching 2FA methods for the user",
                    detail: error.message,
                    life: 10000,
                });
            }
        }
    }
});
const slots = useSlots();
const widgetLabelSlotNames = getWidgetSlotsComputed(slots);
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
                <field-string label="Method" name="method">
                    <widget-select
                        :required="true"
                        autocapitalize="none"
                        autocorrect="off"
                        :options="computedOptions"
                    />
                </field-string>
                <field-string v-if="form.values?.method" label="Code" name="code">
                    <widget-input :required="true">
                        <template v-for="slotName in widgetLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                            <slot :name="slotName" v-bind="slotProps" />
                        </template>
                    </widget-input>
                </field-string>
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
                        text
                        :label="
                            timer
                                ? `Send ${form.values?.method} again in ${cooldownSeconds}s`
                                : `Send ${form.values?.method}`
                        "
                        :disabled="loading || timer"
                        :loading="loading"
                        @click="handleSendCode"
                    />
                    <Button
                        verb="next"
                        label="Verify"
                        :disabled="loading || !form.values?.code"
                        :loading="loading"
                        severity="primary"
                        type="submit"
                    />
                </div>
            </slot>
        </template>
    </authorizing-form>
</template>
