<script setup>
import AuthForm from "@vueda/components/AuthForm.vue";
import LoadingSpinnerInline from "@vueda/components/LoadingSpinnerInline.vue";
import Button from "@vueda/controls/button/Button.vue";
import Alert from "@vueda/feedback/alert/Alert.vue";
import AlertDescription from "@vueda/feedback/alert/AlertDescription.vue";
import AlertTitle from "@vueda/feedback/alert/AlertTitle.vue";
import { storeUser } from "@vueda/stores/storeUser.js";
import "@vueda/theme/vueda-tailwind/views/ViewRecoveryCodes.theme.js";
import { useIcons } from "@vueda/use/useIcons.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useTheme } from "@vueda/use/useTheme.js";
import { useClipboard } from "@vueuse/core";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { toast } from "vue-sonner";

/**
 * Account security page for managing two-factor authentication recovery codes. Displays the user's unused
 * recovery codes (when a TOTP device is configured) with options to copy, download, or print them, and
 * provides a button to generate a fresh set of codes.
 */
defineOptions({});

const userStore = storeUser();
const isActive = useIsActive();
const router = useRouter();
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

const goToSetupDevice = async () => {
    if (router.hasRoute("setup-device")) {
        await router.push({ name: "setup-device" });
    }
};

const { copied, copy } = useClipboard();
const theme = useTheme("ViewRecoveryCodes");
const icon = useIcons("ViewRecoveryCodes");
</script>

<template>
    <!-- TODO: theme.hideStyle requires a single themed root; root is a delegated <auth-form> child that owns its own hideStyle, this component only themes inner slots. -->
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
                    <Alert variant="warning">
                        <AlertTitle>Each code works once.</AlertTitle>
                        <AlertDescription>
                            Store these codes somewhere safe. They are the last way to reach your account if you lose
                            your password and second factor.
                        </AlertDescription>
                    </Alert>
                </div>
                <div :class="theme('listContainer')" data-qa="view-recovery-codes-form-list-container">
                    <ol :class="theme('list')" data-qa="view-recovery-codes-form-list">
                        <li
                            v-for="(code, index) in recoveryCodes"
                            :key="code"
                            :class="theme('listItem')"
                            data-qa="view-recovery-codes-form-list-item"
                        >
                            <span :class="theme('listItemNum')" aria-hidden="true">{{ index + 1 }}.</span>
                            <span>{{ code }}</span>
                        </li>
                    </ol>
                </div>

                <div :class="theme('savingOptionButtons')" data-qa="view-recovery-codes-saving-options">
                    <Button :class="theme('savingOptionButton')" variant="outline" size="sm" @click="downloadCodes">
                        <component
                            :is="icon('floppyDisk').component"
                            v-if="icon('floppyDisk')"
                            v-bind="icon('floppyDisk').props"
                            aria-hidden="true"
                        />
                        Download
                    </Button>
                    <Button :class="theme('savingOptionButton')" variant="outline" size="sm" @click="printPage">
                        <component
                            :is="icon('print').component"
                            v-if="icon('print')"
                            v-bind="icon('print').props"
                            aria-hidden="true"
                        />
                        Print
                    </Button>
                    <Button :class="theme('savingOptionButton')" variant="outline" size="sm" @click="copy(codesText)">
                        <component
                            :is="icon('copy').component"
                            v-if="icon('copy')"
                            v-bind="icon('copy').props"
                            aria-hidden="true"
                        />
                        {{ copied ? "Copied!" : "Copy All" }}
                    </Button>
                </div>
            </div>
            <Alert v-else variant="warning">
                <AlertTitle>Set up two-factor first.</AlertTitle>
                <AlertDescription>
                    Recovery codes back up a second-factor device. Add one to view or generate codes.
                </AlertDescription>
            </Alert>
        </template>
        <template #action-bar="{ loading, handleCancelClick }">
            <div v-if="hasTotpdevices" :class="theme('actionBar')" data-qa="view-recovery-codes-form-action-bar">
                <div :class="theme('actionBarTitleTextContainer')" data-qa="view-recovery-codes-form-action-title">
                    <strong> Generate new recovery codes </strong>
                    When you generate new recovery codes, you must download or print the new codes. Your old codes won't
                    work anymore.
                </div>
                <Button :disabled="loading" type="submit">
                    <LoadingSpinnerInline v-if="loading" />
                    Generate new recovery codes
                </Button>
                <Button variant="ghost" :disabled="loading" @click="handleCancelClick">
                    <LoadingSpinnerInline v-if="loading" />
                    Go Back
                </Button>
            </div>
            <div v-else :class="theme('emptyActions')" data-qa="view-recovery-codes-form-action-bar-invalid">
                <Button :disabled="loading" @click="goToSetupDevice">
                    <LoadingSpinnerInline v-if="loading" />
                    Set up a device
                </Button>
                <Button variant="ghost" :disabled="loading" @click="handleCancelClick">
                    <LoadingSpinnerInline v-if="loading" />
                    Go Back
                </Button>
            </div>
        </template>
    </auth-form>
</template>
