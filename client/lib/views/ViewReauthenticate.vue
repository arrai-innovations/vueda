<script setup>
import Button from "@vueda/controls/button/Button.vue";
import LoadingSpinnerInline from "@vueda/display/loading/LoadingSpinnerInline.vue";
import FormField from "@vueda/form/form-model/FormField.vue";
import { storeUser } from "@vueda/stores/storeUser.js";
import { AUTH_FLOW, REAUTHENTICATION_FLOW_IDS } from "@vueda/utils/constants.js";
import AuthorizingForm from "@vueda/views/AuthorizingForm.vue";
import ViewTwoFactorAuth from "@vueda/views/ViewTwoFactorAuth.vue";
import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";
import { computed, reactive, ref, useSlots, watch } from "vue";

/**
 * Default reauthentication view. Confirms a signed-in user's identity before a reauthentication-guarded
 * action, with the proof the server requires for the account. `storeUser.pendingFlow` names it:
 * `mfa_reauthenticate` renders `ViewTwoFactorAuth` submitting through `storeUser.twoFactorReauthenticate`;
 * `reauthenticate` renders a password form in an AuthorizingForm card submitting through
 * `storeUser.reauthenticate`. Both wait for `recentlyLoggedIn` before redirecting, so a user whose session
 * is already recent is sent on without a prompt.
 *
 * The `header`, `subTitle`, and `toasts` set here are defaults: an attribute passed in with the same name falls
 * through to whichever form is showing and replaces it, as does any other AuthorizingForm prop such as `redirect`.
 * Integrators can replace pieces of the password form through the `field(password)`, `widget(password)`, and
 * `action-bar` slots; other slots are forwarded to the form being rendered.
 *
 * @vueda-slot-forward AuthorizingForm
 */
defineOptions({});

const userStore = storeUser();

// The form follows the pending flow and holds once chosen. Completing the flow clears `pendingFlow`
// while the redirect is still running, and holding keeps the form from swapping underneath it.
const flow = ref(null);
watch(
    () => userStore.pendingFlow?.id,
    (id) => {
        if (REAUTHENTICATION_FLOW_IDS.includes(id)) {
            flow.value = id;
        }
    },
    { immediate: true },
);
const usesTwoFactor = computed(() => flow.value === AUTH_FLOW.MFA_REAUTHENTICATE);

const formProps = reactive({
    initialValues: {
        password: "",
    },
});

const REAUTHENTICATED_TOASTS = {
    success: {
        title: "Identity Confirmed",
        description: "You can continue where you left off.",
    },
    redirectFailed: {
        title: "Identity confirmed, but could not open the next page",
        description: "Your identity is confirmed. Use the navigation to continue.",
    },
};

const handleSubmit = ({ formValues }) => {
    return userStore.reauthenticate({
        password: formValues.password,
    });
};

const handleTwoFactorSubmit = ({ formValues }) => {
    return userStore.twoFactorReauthenticate({
        code: formValues.code,
    });
};

// Slots the password form renders with its own defaults; excluded from the generic forward loop so an
// explicit default and a forwarded consumer slot never define the same slot twice on the AuthorizingForm.
const slots = useSlots();
const HANDLED_SLOTS = new Set(["action-form-inner", "action-bar"]);
const forwardedSlots = computed(() => Object.keys(slots).filter((name) => !HANDLED_SLOTS.has(name)));
const allSlots = computed(() => Object.keys(slots));
</script>
<template>
    <view-two-factor-auth
        v-if="usesTwoFactor"
        :run-action="handleTwoFactorSubmit"
        header="Confirm your identity"
        :require-recent-login="true"
        :toasts="REAUTHENTICATED_TOASTS"
    >
        <template v-for="slot in allSlots" #[slot]="slotProps">
            <slot :name="slot" v-bind="slotProps || {}" />
        </template>
    </view-two-factor-auth>
    <authorizing-form
        v-else
        :run-action="handleSubmit"
        header="Confirm your identity"
        sub-title="Enter your password again to verify your identity."
        :form-props="formProps"
        :require-recent-login="true"
        :toasts="REAUTHENTICATED_TOASTS"
        action-error-summary="Verification Failed"
    >
        <template #action-form-inner>
            <!-- Replaces the entire password field row, including its label. -->
            <slot name="field(password)" label="Password">
                <FormField validation="text" label="Password" name="password">
                    <!-- Replaces the password input widget; receives standard widget props. -->
                    <slot name="widget(password)" :required="true" type="password" autocomplete="current-password">
                        <WidgetTextInput :required="true" type="password" autocomplete="current-password" />
                    </slot>
                </FormField>
            </slot>
        </template>
        <!-- Single "Verify" action, full width like ViewSignIn's submit: there is nothing to cancel to, and the
             server re-validates each attempt, so the button is gated on `loading` only. -->
        <template #action-bar="actionBarProps">
            <slot name="action-bar" v-bind="actionBarProps">
                <div
                    class="flex flex-row flex-wrap items-center gap-2 px-4 py-3 mt-2 border-t-hairline bg-muted/25 rounded-b-vueda-card"
                >
                    <Button type="submit" tone="primary" class="w-full" :disabled="actionBarProps.loading">
                        <LoadingSpinnerInline v-if="actionBarProps.loading" />
                        Verify
                    </Button>
                </div>
            </slot>
        </template>
        <template v-for="slot in forwardedSlots" #[slot]="slotProps">
            <slot :name="slot" v-bind="slotProps || {}" />
        </template>
    </authorizing-form>
</template>
