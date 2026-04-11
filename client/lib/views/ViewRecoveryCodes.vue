<script setup>
import AuthForm from "@vueda/components/AuthForm.vue";
import ControlButton from "@vueda/controls/button/ControlButton.vue";
import FeedbackAlert from "@vueda/feedback/alert/FeedbackAlert.vue";
import FeedbackAlertDescription from "@vueda/feedback/alert/FeedbackAlertDescription.vue";
import FeedbackSpinner from "@vueda/feedback/spinner/FeedbackSpinner.vue";
import { storeUser } from "@vueda/stores/storeUser.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useTheme } from "@vueda/use/useTheme.js";
import { useClipboard } from "@vueuse/core";
import { computed, ref, watch } from "vue";
import { toast } from "vue-sonner";

/**
 * Account security page for managing two-factor authentication recovery codes. Displays the user's unused
 * recovery codes (when a TOTP device is configured) with options to copy, download, or print them, and
 * provides a button to generate a fresh set of codes.
 */
defineOptions({});

const userStore = storeUser();
const isActive = useIsActive();
const recoveryCodes = ref(null);
const hasTotpdevices = computed(() => userStore.loggedInUser?.totp_devices?.length > 0);

watch([isActive, hasTotpdevices], async ([newActive, newHasTotpdevices]) => {
    if (newActive && newHasTotpdevices) {
        const response = await userStore.getRecoveryCodes();
        recoveryCodes.value = response?.data?.unused_codes;
    }
});

const codesText = computed(() => {
    if (!recoveryCodes.value) return "";
    return Array.isArray(recoveryCodes.value) ? recoveryCodes.value.join("\n") : recoveryCodes.value;
});

const downloadCodes = () => {
    const text = codesText.value.trim();
    if (!text) return;
    const blob = new Blob([text + "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recovery-codes.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};
const printPage = () => {
    if (typeof window !== "undefined" && typeof window.print === "function") {
        window.print();
    }
};

const handleSuccess = (response) => {
    recoveryCodes.value = response.data.unused_codes;
    toast.success("New recovery codes generated successfully.");
};

const { copied, copy } = useClipboard();
const theme = useTheme("ViewRecoveryCodes");
</script>

<template>
    <auth-form
        :run-action="() => userStore.generateRecoveryCode()"
        sub-title="Recovery codes can be used to access your account in the event you lose access to your device and cannot receive two-factor authentication codes."
        header="Two-Factor Recovery codes"
        :action-error-summary="'Failed to generate new recovery codes.'"
        :on-submission-success-handler="handleSuccess"
    >
        <template #action-form-inner>
            <div v-if="hasTotpdevices" :class="theme('inner')" data-qa="view-recovery-codes-form-inner">
                <strong data-qa="view-recovery-codes-form-inner-title"> Unused Recovery codes: </strong>
                <div :class="theme('messageContainer')" data-qa="view-recovery-codes-form-message-container">
                    <FeedbackAlert variant="warning">
                        <FeedbackAlertDescription>
                            Keep your recovery codes in a safe spot. These codes are the last resort for accessing your
                            account in case you lose your password and second factors. If you cannot find these codes,
                            you <strong>will</strong> lose access to your account.
                        </FeedbackAlertDescription>
                    </FeedbackAlert>
                </div>
                <div :class="theme('listContainer')" data-qa="view-recovery-codes-form-list-container">
                    <ul :class="theme('list')" data-qa="view-recovery-codes-form-list">
                        <li
                            v-for="code in recoveryCodes"
                            :key="code"
                            :class="theme('listItem')"
                            data-qa="view-recovery-codes-form-list-item"
                        >
                            {{ code }}
                        </li>
                    </ul>
                </div>

                <div :class="theme('savingOptionButtons')" data-qa="view-recovery-codes-saving-options">
                    <ControlButton class="w-32" variant="secondary" size="sm" @click="downloadCodes"
                        >Download</ControlButton
                    >
                    <ControlButton class="w-32" variant="secondary" size="sm" @click="printPage">Print</ControlButton>
                    <ControlButton
                        class="w-32"
                        :variant="copied ? 'default' : 'secondary'"
                        size="sm"
                        @click="copy(codesText)"
                    >
                        {{ copied ? "Copied!" : "Copy All" }}
                    </ControlButton>
                </div>
            </div>
            <FeedbackAlert v-else variant="destructive">
                <FeedbackAlertDescription>
                    You don't have 2FA enabled. Set up a two-factor authentication device first to view or generate
                    recovery codes.
                </FeedbackAlertDescription>
            </FeedbackAlert>
        </template>
        <template #action-bar="{ loading, handleCancelClick }">
            <div v-if="hasTotpdevices" :class="theme('actionBar')" data-qa="view-recovery-codes-form-action-bar">
                <div :class="theme('actionBarTitleTextContainer')" data-qa="view-recovery-codes-form-action-title">
                    <strong> Generate new recovery codes </strong>
                    When you generate new recovery codes, you must download or print the new codes. Your old codes won't
                    work anymore.
                </div>
                <ControlButton :disabled="loading" type="submit">
                    <FeedbackSpinner v-if="loading" />
                    Generate new recovery codes
                </ControlButton>
                <ControlButton variant="ghost" :disabled="loading" @click="handleCancelClick">
                    <FeedbackSpinner v-if="loading" />
                    Go Back
                </ControlButton>
            </div>
            <div v-else data-qa="view-recovery-codes-form-action-bar-invalid">
                <ControlButton :disabled="loading" @click="handleCancelClick">
                    <FeedbackSpinner v-if="loading" />
                    Go Back
                </ControlButton>
            </div>
        </template>
    </auth-form>
</template>
