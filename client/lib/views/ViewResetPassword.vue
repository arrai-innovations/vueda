<script setup>
import { toast } from "@arrai-innovations/vue-sonner";
import Button from "@vueda/controls/button/Button.vue";
import LoadingSpinnerInline from "@vueda/display/loading/LoadingSpinnerInline.vue";
import FormField from "@vueda/form/form-model/FormField.vue";
import { storeUser } from "@vueda/stores/storeUser.js";
import AuthorizingForm from "@vueda/views/AuthorizingForm.vue";
import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";
import { computed, onMounted, reactive, ref, useSlots } from "vue";
import { useRouter } from "vue-router";

/**
 * Default reset password view, the page a password reset email links to. Checks the link, then
 * asks for a new password and its confirmation inside an AuthorizingForm card.
 *
 * The emailed link carries the account's `pk` in its path and the `token` in its query, so a
 * route passes both as props, for example `/reset-password/:pk` with
 * `props: (route) => ({ pk: route.params.pk, token: route.query.token })`. A link the server
 * rejects shows the `invalid-message` slot instead of the form. After a successful reset the view
 * goes to `signInTo`.
 *
 * Replace pieces through the `field(password)`, `widget(password)`, `field(password_confirm)`,
 * `widget(password_confirm)`, `action-bar`, and `invalid-message` slots; any other
 * AuthorizingForm or ActionForm slot is forwarded through.
 *
 * @vueda-slot-forward AuthorizingForm
 */
defineOptions({});

const props = defineProps({
    /** The account identifier from the reset link's path. */
    pk: {
        type: String,
        required: true,
    },
    /** The reset token from the reset link's query string. */
    token: {
        type: String,
        required: true,
    },
    /** Route location to go to after a successful reset, and for the "Sign in" link. */
    signInTo: {
        type: [String, Object],
        default: () => ({ name: "sign-in" }),
    },
    /** Route location for requesting a new link when this one is invalid. */
    forgotPasswordTo: {
        type: [String, Object],
        default: () => ({ name: "forgot-password" }),
    },
});
const emit = defineEmits([
    /** Emitted on mount with a readonly ref to the reactive form values object. */
    "form-object",
    /** Emitted on mount with the form context. Use its methods for programmatic form updates. */
    "form-context",
]);

const formProps = reactive({
    initialValues: {
        password: "",
        password_confirm: "",
    },
});
const userStore = storeUser();
const router = useRouter();

// The form shows while the check runs; a rejected link swaps it for the invalid-message slot.
const linkInvalid = ref(false);
onMounted(() => {
    userStore.checkResetLinkIsValid({ pk: props.pk, token: props.token }).catch(() => {
        linkInvalid.value = true;
    });
});

const handleSubmit = ({ formValues }) => {
    return userStore.resetPassword({
        password: formValues.password,
        password_confirm: formValues.password_confirm,
        pk: props.pk,
        token: props.token,
    });
};

const goToSignIn = async () => {
    toast.success("Password Reset", {
        description: "Sign in with your new password.",
        duration: 10000,
    });
    await router.push(props.signInTo);
};

// Slots rendered here with their own defaults; excluded from the generic forward loop so a
// forwarded consumer slot and an explicit default never define the same slot twice.
const slots = useSlots();
const HANDLED_SLOTS = new Set(["action-form-inner", "action-bar", "invalid-message"]);
const forwardedSlots = computed(() => Object.keys(slots).filter((name) => !HANDLED_SLOTS.has(name)));
</script>
<template>
    <authorizing-form
        :run-action="handleSubmit"
        header="Reset Password"
        sub-title="Enter a new password for your account"
        :form-props="formProps"
        :permitted="!linkInvalid"
        action-error-summary="Password Not Reset"
        :on-submission-success-handler="goToSignIn"
        @form-object="emit('form-object', $event)"
        @form-context="emit('form-context', $event)"
    >
        <template #action-form-inner>
            <!-- Replaces the entire new-password field row, including its label. -->
            <slot name="field(password)" label="New Password">
                <FormField validation="text" label="New Password" name="password">
                    <!-- Replaces the new-password input widget; receives standard widget props. -->
                    <slot name="widget(password)" :required="true" type="password" autocomplete="new-password">
                        <WidgetTextInput :required="true" type="password" autocomplete="new-password" />
                    </slot>
                </FormField>
            </slot>
            <!-- Replaces the entire confirm-password field row, including its label. -->
            <slot name="field(password_confirm)" label="Confirm New Password">
                <FormField validation="text" label="Confirm New Password" name="password_confirm">
                    <!-- Replaces the confirm-password input widget; receives standard widget props. -->
                    <slot name="widget(password_confirm)" :required="true" type="password" autocomplete="new-password">
                        <WidgetTextInput :required="true" type="password" autocomplete="new-password" />
                    </slot>
                </FormField>
            </slot>
        </template>
        <!-- One submit button, sized like ViewSignIn's, since there is nothing to cancel back to. -->
        <template #action-bar="actionBarProps">
            <slot name="action-bar" v-bind="actionBarProps">
                <div
                    class="flex flex-row flex-wrap items-center gap-2 px-4 py-3 mt-2 border-t-hairline bg-muted/25 rounded-b-vueda-card"
                >
                    <Button type="submit" tone="primary" class="w-full" :disabled="actionBarProps.loading">
                        <LoadingSpinnerInline v-if="actionBarProps.loading" />
                        Reset Password
                    </Button>
                </div>
            </slot>
        </template>
        <template #invalid-message>
            <!-- Shown instead of the form when the server rejects the reset link. -->
            <slot name="invalid-message" :forgot-password-to="props.forgotPasswordTo" :sign-in-to="props.signInTo">
                <div class="flex flex-col items-center gap-2 p-6 text-center" data-qa="reset-password-invalid">
                    <h1 class="text-lg font-semibold">Invalid Reset Link</h1>
                    <p>This password reset link is invalid or has already been used.</p>
                    <div class="flex gap-2">
                        <Button as-child tone="primary">
                            <router-link :to="props.forgotPasswordTo">Request a new link</router-link>
                        </Button>
                        <Button as-child emphasis="link">
                            <router-link :to="props.signInTo">Sign in</router-link>
                        </Button>
                    </div>
                </div>
            </slot>
        </template>
        <template v-for="slot in forwardedSlots" #[slot]="slotProps">
            <slot :name="slot" v-bind="slotProps || {}" />
        </template>
    </authorizing-form>
</template>
